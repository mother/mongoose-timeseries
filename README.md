# mongoose-timeseries

a time series data and analytics storage plugin for [Mongoose](http://mongoosejs.com).

[![NPM](https://nodei.co/npm/mongoose-timeseries.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/mongoose-timeseries/)

## Installation

```sh
npm install mongoose-timeseries
```

## Usage

#### Create your Schema

```js
var YourDocumentSchema = new Schema({
   attr1: { type: Schema.Types.ObjectId, ref: 'attr1' },
   attr2: { type: Schema.Types.ObjectId, ref: 'attr2' },
   date: { type: Date, default: Date.now },
   analytics: {
     metric: { type: Number }
   },
   info: {
      sub1: { type: String },
      sub2: { type: String },
      sub3: { type: String }
   }
})
```

#### Apply Plugin
```js
var mongoose = require('mongoose')
var timeseries = require('mongoose-timeseries')

YourDocumentSchema.plugin(timeseries, {
   target: 'TimeSeriesDocument',
   dateField: 'date',
   resolutions: ['minute', 'day'],
   key: {
      attr1: 1,
      attr2: 1,
      info: function(doc) {
         return doc.info.sub1 + doc.info.sub2 + doc.info.sub3
      }
   },
   data: {
      metric: {
         source: 'analytics.metric',
         operation: 'sum'
      }
   }
})
```

#### Watch your time series data grow!

Saved time series documents will look like:
```
{
  date: {
    start: Mon Aug 01 2016 00:00:00 GMT-0600(MDT),
    end: Mon Aug 01 2016 23:58:42 GMT-0600(MDT)
  }
  resolution: 'day',
  count: 5,
  data: {
    metric: {
      count: 5,
      sum: 697
    }
  },
  key: {
    attr1: '55931aba4f3b26d63810a55d',
    attr2: '5536011b00a57af8243d7e5b',
    info: 'ABC'
  },
  _id: 57 a50178e47cea6f5d7f1c3b
}
```

## Documentation

#### Function

```js
YourDocumentSchema.plugin(timeseries, options(Object))
```

You can apply multiple times with different options:
```js
YourDocumentSchema.plugin(timeseries, options1(Object))
YourDocumentSchema.plugin(timeseries, options2(Object))
YourDocumentSchema.plugin(timeseries, options3(Object))
```

#### Options

```js
target(String)
```
The MongoDB collection name (destination) of the specific time series data.

---

```js
dateField(String)
```
The custom date field of your schema (if applicable).
If not set, defaults to ```document._id.getTimestamp()```

---

```js
resolutions(Array)
```
The time series resolutions you want:
Can include any or all of ['minute', 'hour', 'day', 'month']

---

```js
key(Object)
```
The unique information you'd like your time series to separate and store.

```js
key.'attribute'(Number | Function)
```
For each key, use the number '1' to relay the name, or a function that returns your value to store on the key.

---

```js
data(Object)
```
The data you'd like to keep track of.

```js
data.'attribute'.source(String)
```
The source of the parameter you're tracking.
Can be nested like:
```js
'analytics.metrics.metric1'
```

```js
data.'attribute'.operation(String)
```
The operation to perform. Currently only `'sum'` is supported.

---

## Using the Time Series Data

Now, in your front-end analytics, you can query the time series data like:
```js
var startDateFromUI = ...
var endDateFromUI = ...

TimeSeriesAnalyticsModel.find({
  resolution: 'day',
  'date.start': {
    $gte: startDateFromUI,
    $lte: endDateFromUI
  }
} function(err, results) {
  addAverage(results, 'metric')
  var avg = totalAverage(results, 'metric')
})
```

And once you collect that data you can perform calculations however you please.

For example, calculate the average:
```js
function addAverage(results, metric) {
  for (var i = 0; i < results.length, i++) {
    var result = results[i]
    result.data[metric].average = result.data[metric].sum / result.data[metric].count
  }
}

function totalAverage(results, metric) {
  var totalSum, totalCount = 0
  for (var i = 0; i < results.length; i++) {
    totalSum += results.data[metric].sum
    totalCount += results.data[metric].count
  }
  return totalSum / totalCount
}
```

## Tests (incomplete)

```sh
npm install
npm test
```

## Assumptions

- Original source documents are a continual stream of data being dumped
- Documents in the source time-series collection are never themselves found and updated

## To-do

- [ ] Tests
- [ ] More operations beyond count and sum if possible (average, max, min)
- [ ] Auto-indexing
- [ ] Auto-remove (removes source time-series documents automatically after a set interval)

## License

[MIT](LICENSE)
