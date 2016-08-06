var mongoose = require('mongoose')
var Schema = mongoose.Schema

var TimeSeriesSchema = new Schema({
  timestamp: { type: Date, default: Date.now, required: true, index: true },
  interval: { type: String, enum: ['minute', 'hour', 'day', 'month'], required: true },
  key: {},
  data: {}
}, { timestamps: { createdAt: 'created', updatedAt: 'updated' } })

module.exports = exports = function timeSeriesPlugin (schema, options) {
  // Error checking
  if (typeof options === 'undefined' || !options) {
    throw new Error('you must specify the timeseries plugin options object')
  }
  if (!options.name) {
    throw new Error('you must specify the timeseries plugin options attribute "name"')
  } else if (!options.intervals) {
    throw new Error('you must specify the timeseries plugin options attribute "intervals"')
  } else if (!options.keys) {
    throw new Error('you must specify the timeseries plugin options attribute "keys"')
  }

  // New model name for every plugin usage
  var TimeSeriesModel = mongoose.model(options.name, TimeSeriesSchema)

  schema.pre('save', function (next) {
    var document = this

    var documentDate
    if (options.dateKey) {
      documentDate = document[options.dateKey]
    } else {
      documentDate = document._id.getTimeStamp()
    }

    var timestamps = {}
    for (var i = 0; i < options.intervals.length; i++) {
      var interval = options.intervals[i]
      switch (interval) {
        case 'minute':
          timestamps[interval] = new Date(
            documentDate.getFullYear(),
            documentDate.getMonth(),
            documentDate.getDate(),
            documentDate.getHours(),
            documentDate.getMinutes()
          )
          break
        case 'hour':
          timestamps[interval] = new Date(
            documentDate.getFullYear(),
            documentDate.getMonth(),
            documentDate.getDate(),
            documentDate.getHours()
          )
          break
        case 'day':
          timestamps[interval] = new Date(
            documentDate.getFullYear(),
            documentDate.getMonth(),
            documentDate.getDate()
          )
          break
        case 'month':
          timestamps[interval] = new Date(
            documentDate.getFullYear(),
            documentDate.getMonth()
          )
          break
      }
    }

    var keys = {}
    for (i = 0; i < options.keys.length; i++) {
      var key = options.keys[i].key
      if (options.keys[i].value) {
        keys[key] = options.keys[i].value(document)
      } else {
        keys[key] = document[key]
      }
    }

    var inc = {}

    // count document itself before custom datapoints
    inc['data.count'] = 1

    for (i = 0; i < options.data.length; i++) {
      var datapoint = options.data[i]
      var keyBase = 'data.' + datapoint.key

      // count
      key = keyBase + '.count'
      inc[key] = 1

      // sum
      if (datapoint.sum) {
        key = keyBase + '.sum'
        inc[key] = document[datapoint.key]
      }
    }

    for (i = 0; i < options.intervals.length; i++) {
      interval = options.intervals[i]

      var findBy = {
        timestamp: timestamps[interval],
        interval: interval,
        key: keys
      }

      // Upsert interval
      TimeSeriesModel.findOneAndUpdate(findBy, {
        $inc: inc
      }, { upsert: true, new: true }, function (err, datapoint) {
        if (err) console.log(err)
        console.log(datapoint)
      })
    }

    next()
  })
}
