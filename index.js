var mongoose = require('mongoose')
var Schema = mongoose.Schema

module.exports = exports = function timeSeriesPlugin (schema, options) {
  // Error checking
  if (typeof options === 'undefined' || !options) {
    throw new Error('you must specify the timeseries plugin options object')
  }
  if (!options.target) {
    throw new Error('you must specify the timeseries plugin options attribute "target"')
  } else if (!options.resolutions) {
    throw new Error('you must specify the timeseries plugin options attribute "resolutions"')
  } else if (!options.key) {
    throw new Error('you must specify the timeseries plugin options attribute "key"')
  }

  // Declare Schema
  var TimeSeriesSchema = new Schema({
    date: {
      start: { type: Date, index: true },
      end: { type: Date, index: true }
    },
    resolution: { type: String, enum: ['minute', 'hour', 'day', 'month'], required: true },
    count: { type: Number },
    key: {},
    data: {}
  })

  // Set up time-series document's middleware
  TimeSeriesSchema.post('find', function (results, next) {
    for (var i = 0; i < results.length; i++) {
      var result = results[i]

      if (options.data) {
        var dataNames = Object.keys(options.data)
        var dataObject = options.data

        for (var j = 0; j < dataNames.length; j++) {
          var dataName = dataNames[j]
          var dataValue = dataObject[dataName]

          if (has(result.data, dataValue.source)) {
            if (dataValue.calculations.indexOf('average') !== -1) {
              var average = result.data[dataName].sum / result.data[dataName].count
              result.data[dataName].average = average
              if (dataValue.calculations.indexOf('range_min') !== -1) {
                result.data[dataName].range_min = average - result.data[dataName].min
              }
              if (dataValue.calculations.indexOf('range_max') !== -1) {
                result.data[dataName].range_max = result.data[dataName].max - average
              }
            }
            if (dataValue.calculations.indexOf('range') !== -1) {
              result.data[dataName].range = result.data[dataName].max - result.data[dataName].min
            }
          }
        }
      }
    }
    next()
  })

  // New model target for every plugin usage
  var TimeSeriesModel = mongoose.model(options.target, TimeSeriesSchema)

  // Hook for the model that the plugin applies to
  schema.post('save', function () {
    var document = this

    var documentDate = document._id.getTimestamp()
    if (options.dateField) {
      documentDate = document[options.dateField]
    }

    var timestamps = {}
    for (var i = 0; i < options.resolutions.length; i++) {
      var resolution = options.resolutions[i]
      switch (resolution) {
        case 'minute':
          timestamps[resolution] = new Date(
            documentDate.getFullYear(),
            documentDate.getMonth(),
            documentDate.getDate(),
            documentDate.getHours(),
            documentDate.getMinutes()
          )
          break
        case 'hour':
          timestamps[resolution] = new Date(
            documentDate.getFullYear(),
            documentDate.getMonth(),
            documentDate.getDate(),
            documentDate.getHours()
          )
          break
        case 'day':
          timestamps[resolution] = new Date(
            documentDate.getFullYear(),
            documentDate.getMonth(),
            documentDate.getDate()
          )
          break
        case 'month':
          timestamps[resolution] = new Date(
            documentDate.getFullYear(),
            documentDate.getMonth()
          )
          break
      }
    }

    var key = {}
    var keyNames = Object.keys(options.key)
    var keyObject = options.key
    for (i = 0; i < keyNames.length; i++) {
      var keyName = keyNames[i]
      var keyValue = keyObject[keyName]
      if (typeof keyValue === 'function') {
        key[keyName] = keyValue(document)
      } else if (keyValue === 1) {
        key[keyName] = document[keyName]
      } else {
        throw new Error('invalid timeseries plugin option key value (must be 1 or function)')
      }
    }

    var updates = {}

    var inc = {}
    var min = {}
    var max = {}
    // count document itself before custom operations
    inc['count'] = 1

    if (options.data) {
      var dataNames = Object.keys(options.data)
      var dataObject = options.data
      for (i = 0; i < dataNames.length; i++) {
        var dataName = dataNames[i]
        var dataValue = dataObject[dataName]
        var keyBase = 'data.' + dataName
        if (has(document, dataValue.source)) {
          var value = get(document, dataValue.source)
          if (dataValue.operations.indexOf('sum') !== -1) {
            inc[keyBase + '.sum'] = value
            inc[keyBase + '.count'] = 1
            updates = extend(updates, {
              $inc: inc
            })
          }
          if (dataValue.operations.indexOf('min') !== -1) {
            min[keyBase + '.min'] = value
            updates = extend(updates, {
              $min: min
            })
          }
          if (dataValue.operations.indexOf('max') !== -1) {
            max[keyBase + '.max'] = value
            updates = extend(updates, {
              $max: max
            })
          }
        }
      }
    }

    for (i = 0; i < options.resolutions.length; i++) {
      resolution = options.resolutions[i]

      var findBy = {
        'date.start': timestamps[resolution],
        resolution: resolution,
        key: key
      }

      var set = {
        'date.end': new Date()
      }
      updates = extend(updates, {
        $set: set
      })

      // Upsert resolution
      TimeSeriesModel.findOneAndUpdate(findBy, updates, { upsert: true, new: true }, function (err, datapoint) {
        if (err) console.log(err)
      })
    }
  })
}

function get (obj, key) {
  return key.split('.').reduce(function (o, x) {
    return (typeof o === 'undefined' || o === null) ? o : o[x]
  }, obj)
}

function has (obj, key) {
  return key.split('.').every(function (x) {
    if (typeof obj !== 'object' || obj === null || !(x in obj)) {
      return false
    }
    obj = obj[x]
    return true
  })
}

function extend (objOld, objNew) {
  var obj = objOld
  for (var key in objNew) {
    if (typeof obj[key] === 'object') {
      extend(obj[key], objNew[key])
    } else {
      obj[key] = objNew[key]
    }
  }
  return obj
}
