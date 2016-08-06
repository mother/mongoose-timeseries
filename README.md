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
   metric: { type: Number },
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
   name: 'TimeSeriesDocument',
   dateKey: 'date',
   intervals: ['minute', 'day'],
   keys: [
      {
         key: 'attr1'
      },
      {
         key: 'attr2'
      },
      {
         key: 'info',
         value: function(doc) {
            return doc.sub1 + doc.sub2 + doc.sub3
         }
      }
   ],
   data: [
      {
         key: 'metric',
         sum: true
      }
   ]
})
```

#### Watch your time series data grow!

Saved time series documents will look like:
```
{
  interval: 'day',
  timestamp: Mon Aug 01 2016 00:00:00 GMT-0600(MDT),
  created: Mon Aug 01 2016 00:51:09 GMT-0600(MDT),
  updated: Wed Aug 31 2016 22:19:42 GMT-0600(MDT),
  data: {
    count: 5,
    metric: {
      sum: 697,
      count: 5
    }
  },
  key: {
    attr1: 55931aba4f3b26d63810a55d,
    attr2: 5536011b00a57af8243d7e5b,
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

The collection name of the specific time series data:
```js
name(String)
```

The custom date key of your schema (if applicable):
If not set, defaults to ```document._id.getTimeStamp()```
```js
dateKey(String)
```

The time series intervals you want:
Can include any or all of ['minute', 'hour', 'day', 'month']
```js
intervals(Array)
```

The unique information you'd like your time series to seperate and store:
```js
keys(Array)
```

The name of the key:
```js
keys.key(String)
```

The function that returns your a value to store on the associated key:
*Defaults to the name of the key*
```js
keys.value(Function)
```

The data you'd like your time series to count and sum:
```js
data(Array)
```

The name of the data key:
```js
data.key(String)
```

Boolean to sum the datapoint (only works for Number attributes)
```js
data.sum(Boolean)
```

## Tests (INCOMPLETE)

```sh
npm install
npm test
```

## License

[MIT](LICENSE)
