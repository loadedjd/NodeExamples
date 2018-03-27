const functions = require('firebase-functions');
const admin = require('firebase-admin');
const geoLib = require('geolib')


admin.initializeApp(functions.config().firebase)


exports.getAllRecords = functions.https.onRequest( (req, res) => {


    return admin.database().ref('Records').once('value', function (snap) {
        const records = []

        snap.forEach(function (record) {
            records.push(record)
        })



        res.send(records)
    })
})


exports.getUserRecords = functions.https.onRequest((req, res) => {

    return admin.database().ref('Records').once('value', function (snapshot) {


        const usr = req.query.uid
        var count = 0
        console.log(usr)
        snapshot.forEach(function (record) {
            console.log(record.val())
            if (record.val().User === usr) {
                count = count + 1
            }
        })

        res.send({usr : count})

    })
})


exports.deleteUser = functions.auth.user().onDelete( (event) => {


    const user = event.data
    const uid = user.uid

    var userRef = admin.database().ref('Users/'+uid)

    return userRef.remove()


})




exports.checkIfRecordIsValid = functions.database.ref('Users/{UID}/Records/{Record}').onCreate(function (event) {


    var uid = event.params.UID
    const newRecord = event.data.val()



    const newLat = parseFloat(newRecord.Lat)
    const newLon = parseFloat(newRecord.Long)
    const newTime = newRecord.Time

    console.log(parseFloat(newLon) + ' ' + parseFloat(newLat))


    return admin.database().ref('Users/'+uid).once('value', function(snapshot) {



        var isValid = snapshot.val().Calibrated

        const oneHourAgo = (Date.now() / 1000) - 3600
        const currentTime = (Date.now() / 1000)



        if (isValid) {
            admin.database().ref('Records').on('value', function (snapshot) {



                snapshot.forEach(function (record) {

                    console.log('Official Record ' +record.val())

                    var lat = parseFloat(record.val().Lat)
                    var lon = parseFloat(record.val().Long)
                    var time = record.val().Time


                    console.log('New Lat ' + newLat + ' New Long ' + newLon )
                    console.log('Old Lat ' + lat + ' Old Lon' +  lon)

                    const distance = distanceInKmBetweenEarthCoordinates(lat, lon, newLat, newLon)
                    if (distance <= 0.5 && parseFloat(newTime) > oneHourAgo) {
                        isValid = false
                        return
                    }


                    console.log('Distance ' +distance)

                })

            })
        }


        if (isValid) {
            return admin.database().ref('Records').push(event.data.toJSON())
        }


    })




})




function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function distanceInKmBetweenEarthCoordinates(lat1, lon1, lat2, lon2) {
  var earthRadiusKm = 6371;

  var dLat = degreesToRadians(lat2-lat1);
  var dLon = degreesToRadians(lon2-lon1);

  lat1 = degreesToRadians(lat1);
  lat2 = degreesToRadians(lat2);

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return earthRadiusKm * c;
}

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
