require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});

// setup mongoose and database connection
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});

// creating a model
const Schema = mongoose.Schema;
const urlSchema = new Schema({
  original: { type: String, required: true },
  short: Number,
});
const Url = mongoose.model("Url", urlSchema);

let bodyParser = require("body-parser");
let responseObject = {};

// You can POST a URL to /api/shorturl and get a JSON response with original_url and short_url properties. Here's an example: { original_url : 'https://freeCodeCamp.org', short_url : 1}
// If you pass an invalid URL that doesn't follow the valid http://www.example.com format, the JSON response will contain { error: 'invalid url' }
app.post(
  "/api/shorturl",
  bodyParser.urlencoded({ extended: false }),
  (request, response) => {
    let inputUrl = request.body["url"];

    let urlRegex = new RegExp(/^[http://www.]/gi);

    if (!inputUrl.match(urlRegex)) {
      response.json({ error: "invalid url" });
      return;
    }

    responseObject["original_url"] = inputUrl;

    let inputShort = 1;

    Url.findOne({})
      .sort({ short: "desc" })
      .exec((error, result) => {
        if (!error && result != undefined) {
          inputShort = result.short + 1;
        }
        if (!error) {
          Url.findOneAndUpdate(
            { original: inputUrl },
            { original: inputUrl, short: inputShort },
            { new: true, upsert: true },
            (error, savedUrl) => {
              if (!error) {
                responseObject["short_url"] = savedUrl.short;
                response.json(responseObject);
              }
            }
          );
        }
      });
  }
);

// When you visit /api/shorturl/<short_url>, you will be redirected to the original URL.
app.get("/api/shorturl/:input", (request, response) => {
  let input = request.params.input;

  Url.findOne({ short: input }, (error, result) => {
    if (!error && result != undefined) {
      response.redirect(result.original);
    } else {
      response.json("URL not Found");
    }
  });
});
