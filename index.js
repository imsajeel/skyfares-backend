const express = require("express");
const app = express();
const bp = require("body-parser");
require("dotenv").config();
const port = process.env.PORT;

const Amadeus = require("amadeus");
const amadeus = new Amadeus({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
});

app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));

app.post("/get-airports", async (req, res) => {
  //   const { keyword } = req.body;

  const response = await amadeus.referenceData.locations
    .get({
      keyword: req.body.keyword,
      subType: "AIRPORT,CITY",
      view: "LIGHT",
      "page[limit]": 10,
    })
    .catch((x) => console.log(x));
  try {
    await res.json(
      JSON.parse(response.body).data.map((des) => {
        delete des.self;

        return des;
      })
    );
  } catch (err) {
    await res.json(err);
  }
});

app.post("/get-offers", async (req, res) => {
  if (
    req.body.originLocation.iataCode &&
    req.body.destinationLocation.iataCode &&
    req.body.departureDate
  ) {
    const obj = {
      currencyCode: "GBP",
      originDestinations: [
        {
          id: "1",
          originLocationCode: req.body.originLocation.iataCode,
          destinationLocationCode: req.body.destinationLocation.iataCode,
          departureDateTimeRange: {
            date: req.body.departureDate,
          },
        },
      ],
      travelers: [],
      sources: ["GDS"],
      searchCriteria: {
        flightFilters: {
          cabinRestrictions: [
            {
              cabin: req.body.class,
              coverage: "MOST_SEGMENTS",
              originDestinationIds: ["1"],
            },
          ],
        },
      },
    };

    if (req.body.isReturn === true) {
      obj.originDestinations.push({
        id: "2",
        originLocationCode: req.body.destinationLocation.iataCode,
        destinationLocationCode: req.body.originLocation.iataCode,
        departureDateTimeRange: {
          date: req.body.returnDate,
        },
      });
      obj.searchCriteria.flightFilters.cabinRestrictions[0].originDestinationIds.push(
        "2"
      );
    }

    const getTravelers = (travelers) => {
      let travelersArray = [];

      let keyTypeOfTravelers = [
        { key: "adults", travelerType: "ADULT" },
        { key: "children", travelerType: "CHILD" },
        { key: "infantSeat", travelerType: "SEATED_INFANT" },
        { key: "infantLap", travelerType: "HELD_INFANT" },
      ];

      let id = 1;
      keyTypeOfTravelers.map((item) => {
        for (let i = 1; i <= travelers[item.key]; i++) {
          travelersArray.push({
            id: id.toString(),
            travelerType: item.travelerType,
          });
          id++;
        }
      });

      return travelersArray;
    };

    obj.travelers = getTravelers(req.body.travelers);

    console.log(obj);
    // res.json(obj);

    const response = await amadeus.shopping.flightOffersSearch
      .post(JSON.stringify(obj))
      .catch((x) => res.json(x));
    try {
      await res.json(JSON.parse(response.body).data);
    } catch (err) {
      await res.json(err);
    }
  } else {
    res.json("Error");
  }
});

app.listen(port, () => {
  console.log(`SkyFares-App is listening on port ${port}`);
});
