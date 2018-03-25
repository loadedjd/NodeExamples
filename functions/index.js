const functions = require('firebase-functions');
const admin = require('firebase-admin');
const geoLib = require('geolib')


admin.initializeApp(functions.config().firebase)

// Take the text parameter passed to this HTTP endpoint and insert it into the
// Realtime Database under the path /messages/:pushId/original
exports.addMessage = functions.https.onRequest((req, res) => {
  // Grab the text parameter.
  const original = req.query.text;
  // Push the new message into the Realtime Database using the Firebase Admin SDK.
  return admin.database().ref('/messages').push({original: original}).then((snapshot) => {
    // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
    return res.redirect(303, snapshot.ref);
  });
})






//exports.canUploadRecord = functions.database.ref('/iOS/{recordID}').onWrite((event) => {


//});




exports.getAllRecordData = functions.https.onRequest((req, res) => {
    return admin.database().ref('Users').on('value', function(snapshot) {

        var records = []

        snapshot.forEach(function (user) {
            user.ref.child('Records').on('value', function(snapshot) {
                snapshot.forEach(function (record) {
                    records.push(record.toJSON())
                })
            })
        });

        res.send(records)
    });
});




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

// Listens for new messages added to /messages/:pushId/original and creates an
// uppercase version of the message to /messages/:pushId/uppercase
exports.makeUppercase = functions.database.ref('/messages/{pushId}/original').onWrite((event) => {
  // Grab the current value of what was written to the Realtime Database.
  const original = event.data.val();
  console.log('Uppercasing', event.params.pushId, original);
  const uppercase = original.toUpperCase();
  // You must return a Promise when performing asynchronous tasks inside a Functions such as
  // writing to the Firebase Realtime Database.
  // Setting an "uppercase" sibling in the Realtime Database returns a Promise.
  return event.data.ref.parent.child('uppercase').set(uppercase);
});

exports.makeLowerCase = functions.database.ref('/messages/{pushId}/uppercase').onWrite( (event) => {

    const original = event.data.val();
    const lowerCase = original.toLowerCase();

    return event.data.ref.parent.child('lowercase').set(lowerCase);

});

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
