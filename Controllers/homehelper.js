var map, datasource, popup, searchURL, routeURL;

function GetMap() {
    //Initialize a map instance.
    map = new atlas.Map('myMap', {
        view: 'Auto',

        //Add authentication details for connecting to Azure Maps.
        authOptions: {
            //Use Azure Active Directory authentication.
            authType: 'anonymous',
            clientId: "e665fe7d-03c8-4033-ae85-e9bd5da30424", //Your Azure Active Directory client id for accessing your Azure Maps account.
            getToken: function(resolve, reject, map) {
                //URL to your authentication service that retrieves an Azure Active Directory Token.
                var tokenServiceUrl = "https://azuremapscodesamples.azurewebsites.net/Common/TokenService.ashx";

                fetch(tokenServiceUrl).then(r => r.text()).then(token => resolve(token));
            },

            //Alternatively, use an Azure Maps key. Get an Azure Maps key at https://azure.com/maps. NOTE: The primary key should be used as the key.
            authType: 'subscriptionKey',
            subscriptionKey: 'bXBKAIwTfAbpvkj18SGi_67YXY_zdxo5V5O-15z55EQ'
        }
    });

    //Use MapControlCredential to share authentication between a map control and the service module.
    var pipeline = atlas.service.MapsURL.newPipeline(new atlas.service.MapControlCredential(map));

    //Construct the RouteURL object
    routeURL = new atlas.service.RouteURL(pipeline);

    //Create an instance of the SearchURL client.
    searchURL = new atlas.service.SearchURL(pipeline);

    //Wait until the map resources are ready.
    map.events.add('ready', function() {
        //Create a popup for displaying route section details.
        popup = new atlas.Popup();

        datasource = new atlas.source.DataSource();
        map.sources.add(datasource);

        //Create two line layers. One for the base route line, and another for the traffic sections on top. Render these below the labels.
        map.layers.add(
            //Render the base route line. This will look like an outline in areas that have traffic.
            new atlas.layer.LineLayer(datasource, null, {
                strokeWidth: 9,
                lineJoin: 'round',
                lineCap: 'round',
                filter: ['!', ['has', 'magnitudeOfDelay']]
            }), 'labels');

        //Render the traffic section data above the route line.
        var sectionLayer = new atlas.layer.LineLayer(datasource, null, {
            //Use an expression to style the color based on the traffics magnitiude of delay metric: https://docs.microsoft.com/en-us/rest/api/maps/route/getroutedirections#magnitudeofdelay
            strokeColor: [
                'match', ['get', 'magnitudeOfDelay'],
                3, 'red',
                2, 'orange',

                [
                    'match', ['get', 'simpleCategory'],

                    //If the category of the section is a Jam, make it orange.
                    'JAM', 'orange',

                    //If the category of the section is a road closure, make it black.
                    'ROAD_CLOSURE', 'black',

                    'GreenYellow'
                ]
            ],
            strokeWidth: 7,
            lineJoin: 'round',
            lineCap: 'butt',
            filter: ['has', 'magnitudeOfDelay']
        });

        //Add mouse events on the section layer so we can show a popup with details about the traffic issue.
        map.events.add('mousemove', sectionLayer, showPopup);
        map.events.add('touchstart', sectionLayer, showPopup);

        //Close the popup on mouseout or touchend.
        map.events.add('mouseout', sectionLayer, closePopup);
        map.events.add('touchend', closePopup);

        map.layers.add(sectionLayer, 'labels');

        //Create a layer for rendering the start and end points of the route as symbols.
        map.layers.add(new atlas.layer.SymbolLayer(datasource, null, {
            iconOptions: {
                image: ['get', 'iconImage'],
                allowOverlap: true,
                ignorePlacement: true
            },
            textOptions: {
                textField: ['get', 'title'],
                offset: [0, 1.2]
            },
            filter: ['any', ['==', ['geometry-type'], 'Point'],
                    ['==', ['geometry-type'], 'MultiPoint']
                ] //Only render Point or MultiPoints in this layer.
        }));

        //Calculate the initial route.
        calculateRoute();
    });
}

async function calculateRoute() {
    datasource.clear();

    var start = document.getElementById('startTbx').value;
    var end = document.getElementById('endTbx').value;

    if (start == '' || end == '') {
        alert('Invalid waypoint point specified.');
        return;
    }

    var geocodeOptions = {
        limit: 1,
        view: 'Auto'
    };

    //Geocode the start location.
    var startResult = await searchURL.searchAddress(atlas.service.Aborter.timeout(3000), start, geocodeOptions);

    if (startResult.results && startResult.results.length > 0) {
        var startPoint = [startResult.results[0].position.lon, startResult.results[0].position.lat];

        //Geocode the end location.
        var endResult = await searchURL.searchAddress(atlas.service.Aborter.timeout(3000), end, geocodeOptions);

        if (endResult.results && endResult.results.length > 0) {
            var endPoint = [endResult.results[0].position.lon, endResult.results[0].position.lat];

            //Calculate a route.
            var directions = await routeURL.calculateRouteDirections(atlas.service.Aborter.timeout(10000), [startPoint, endPoint], {
                sectionType: 'traffic', //Route option to return traffic sections.
                maxAlternatives: 0
            });

            //Get the route data as GeoJSON and add it to the data source.
            var data = directions.geojson.getFeatures();
            var route = data.features[0];

            datasource.add([route,
                new atlas.data.Feature(new atlas.data.Point(startPoint), {
                    title: start,
                    iconImage: 'pin-blue'
                }),
                new atlas.data.Feature(new atlas.data.Point(endPoint), {
                    title: end,
                    iconImage: 'pin-red'
                })
            ]);

            //Extract the traffic section data.
            if (route.properties.sections) {
                var sections = route.properties.sections;

                var sectionLines = [];

                //Route path could be a MultiLineString as multiple route legs (specify 3 or more waypoints) can result in multiple lines.
                var routePath = route.geometry.coordinates[0];

                for (var i = 0; i < sections.length; i++) {
                    //Only worry about traffic sections with a magnitude delay of 1 (minor) or higher.
                    if (sections[i].sectionType === 'TRAFFIC' && sections[i].magnitudeOfDelay >= 1) {
                        //Create a line for the traffic section.
                        sectionLines.push(new atlas.data.Feature(new atlas.data.LineString(
                            //Get the coordinates from the route path for the section, startPointIndex...endPointIndex - add 1 as the end index is not included
                            routePath.slice(sections[i].startPointIndex, sections[i].endPointIndex + 1)
                        ), sections[i]));
                    }
                }

                datasource.add(sectionLines);
            }

            //Update the map view to center over the route.
            map.setCamera({
                bounds: data.bbox,
                padding: 30 //Add a padding to account for the pixel size of symbols.
            });
        } else {
            alert('Unable to geocode end waypoint.');
        }
    } else {
        alert('Unable to geocode start waypoint.');
    }
}

function showPopup(e) {
    //Make sure the event occurred on a shape feature.
    if (e.shapes && e.shapes.length > 0) {
        map.getCanvasContainer().style.cursor = 'pointer';

        var properties = e.shapes[0].getProperties();

        //Update the content and position of the popup.
        popup.setOptions({
            //Create the content of the popup.
            content: `<div style="padding:10px;"><b>${properties.simpleCategory}</b><br/>Speed: ${Math.round(properties.effectiveSpeedInKmh * 0.62137119)} mph</div`,
            position: e.position
        });

        //Open the popup.
        popup.open(map);
    }
}

function closePopup() {
    popup.close();
    map.getCanvasContainer().style.cursor = 'grab';
}
module.exports = {
    closePopup,
    showPopup,
    calculateRoute,
    GetMap
};