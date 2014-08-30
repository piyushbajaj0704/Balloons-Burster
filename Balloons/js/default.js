/// <reference path="sound.js" />
/// <reference path="balloons.js" />
// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232509
(function () {
    "use strict";

    WinJS.Binding.optimizeBindingReferences = true;

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;

    //canvas and context
    var canvas;
    var ctx;
        
    //Screen and balloon sizes
    var SCREEN_WIDTH = 1366;
    var SCREEN_HEIGHT = 768;
    var FULLSCREEN_WIDTH = 1366;
    var BALLOON_WIDTH = 200;  //Max width and height of balloons. Actual values will change randomly via transforms.
    var BALLOON_HEIGHT = 367;
    var MAX_X;
    var MAX_Y;

    //Balloons
    var MAX_ACCEL = 17; //Fastest speed of balloons
    var MIN_ACCEL = 7; //Slowest speed of balloons
    var MAX_BALLOONS = 6;  //How large can balloons be
    var MIN_BALLOON_SCALE = 3; //How small can balloons be
    var POINTS_BALLOONHIT = 100; //How many points per balloon

    //Animation
    var DESTROYED_RENDER_FRAMES = 15;
    var LEVEL_RENDER_FRAMES = 10;
    var LEVEL_PTS_REQ = 200;
    var LEVEL_SPEED_INCREASE = 0.1;
    var BIGBOOMPTS_REQ = 1000; //1000 for test, 4000 real gameplay

    //Levels
    var lvlCurrent = 0;
    var lvlNextPts = LEVEL_PTS_REQ;
    var lvlDifficulty = LEVEL_SPEED_INCREASE;

    //initial player score
    var score = 0;
    var scoreBigBoom = 0;
   
    //balloons
    var balloons = new Array(MAX_BALLOONS);

    //animation handler
    var anim = null;

    //Menu    
    var MENUBG = "/images/blue_sky_and_green_grass-wide.jpg";
    var MENUNUM = 0;

    //Game Mode
    var menuEnabled = true;

    //ViewState
    var SNAPPED_VIEW = 320;

    //Game Music
    var musicGame = new Audio("/sounds/theme.wav");
    musicGame.loop = true;

    //Share Text
    var SHARE_TITLE = "Check out my Balloons Score!";

    //camera
    var capturedPhoto;

    //accelerometer
    var accelerometer;
    var intervalId = 0;
    var getReadingInterval = 0;


    function initialize() {
        //Init Canvas
        canvas = document.getElementById("canvas");
        ctx = canvas.getContext("2d");

        //Set up Coordinates for Screen Size
        FULLSCREEN_WIDTH = window.innerWidth;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        SCREEN_HEIGHT = canvas.height;
        SCREEN_WIDTH = canvas.width;

        //Set boundaries to be one balloon size
        MAX_X = canvas.width - (BALLOON_WIDTH);
        MAX_Y = canvas.height - (BALLOON_HEIGHT);
        
        //Set up random location and speeds for all balloons
        initBalloons();

        //Handle View Layout Changes
        window.addEventListener("resize", onViewStateChanged);

        //Init Sounds
        SoundJS.addBatch([
         { name: "explosion", src: "../sounds/pop.wav", instances: 1 },
 	     { name: "newlevel", src: "../sounds/newlevel.wav", instances: 1 },
         { name: "bigboom", src: "../sounds/pops.wav", instances: 1 },
         { name: "startbutton", src: "../sounds/victory.wav", instances: 1 }]);


        //AppBar Commands
        document.getElementById("cmdHome").addEventListener("click", homeAppbar, false);
        document.getElementById("cmdName").addEventListener("click", showplayerNameUpdate, false);
        document.getElementById("submitButton").addEventListener("click", updateplayerName, false);
        document.getElementById("cmdCamera").addEventListener("click", capturePhoto, false);

        //Menu Commands
        document.getElementById("btnStart").addEventListener("MSPointerUp", startGame, false);
        //Handle Touch
        canvas.addEventListener("MSPointerUp", touchHandler, false);
        //Game Menu
        showMenu();

        //Share Contract
        var dataTransferManager = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
        dataTransferManager.addEventListener("datarequested", shareHighScore);


        //Init ref to Accelerometer but do not turn the device on
        initAccel();

        //Game Loop - update, draw
        update();

    }

    //Generate balloon collection
    function initBalloons() {
        var balloon;
        var ran;

        for (var i = 0; i < MAX_BALLOONS; i++) {
            balloon = createBalloon();
            balloons[i] = balloon;
        }
    }

    function createBalloon() {
        //Set up percentages for scalar transforms on balloons
        var ran = (randomNumRange(MIN_BALLOON_SCALE, 10) * .10).toFixed(2);
        var rndballoon = new Balloon(MAX_X, MAX_Y, MIN_ACCEL, MAX_ACCEL, lvlDifficulty);
        rndballoon.width = BALLOON_WIDTH * ran;
        rndballoon.height = BALLOON_HEIGHT * ran;

        rndballoon.img.onload = function () {
            ctx.drawImage(rndballoon.img, rndballoon.x, rndballoon.y, rndballoon.width,rndballoon.height);
        }

        return rndballoon;
    }

    //Game Loop to update x position of balloon
    function update() {

        //RequestAnimationFrame faster perf than setInterval
        anim = window.requestAnimationFrame(update);

        if (!menuEnabled) {
            //Game Loop
            updateBalloons();
            drawBalloons();
        }
    }

    // Move balloon across screen based on that balloons acceleration.
    // If balloon has moved one balloon length passed beginning 
    // of screen move it back to the beginning.
    function updateBalloons() {
        var balloon;
        for (var i = 0; i < MAX_BALLOONS; i++) {
            balloon = balloons[i];

            if (balloon.y <= -BALLOON_HEIGHT) {
                balloon.y = SCREEN_HEIGHT;
                balloon.x = Math.random() * MAX_X;
                balloons[i] = balloon;
            }
            balloon.y += -balloon.accel;
        }

    }

    //Render balloons to canvas
    function drawBalloons() {
        var balloon;

        //clear each frame
        ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        //Render balloons to canvas 
        for (var i = 0; i < MAX_BALLOONS; i++) {
            balloon = balloons[i];
            ctx.drawImage(balloon.img, balloon.x, balloon.y, balloon.width, balloon.height);
            if (balloon.destroyed) {
                balloons[i] = blowUpAnimation(balloon);
            }

        }
    }

    //If balloon explosion has been rendered for appropriate amount of frames get a new balloon
    function blowUpAnimation(balloon) {
        if (balloon.destroyRendered > DESTROYED_RENDER_FRAMES) {
            balloon = createBalloon();
        }
        else {
            balloon.destroyRendered += 1;
        }
        return balloon;
    }


    //Set Up Menu Screen UI Elements
    function showMenu(event) {
        menuEnabled = true;

        musicGame.pause();

        txtPlayerName.style.visibility = "hidden";
        txtScore.style.visibility = "hidden";
        imgPlayer.style.visibility = "hidden";
        imgMenu.style.visibility = "visible";
        btnStart.style.visibility = "visible";
        txtLevel.style.visibility = "hidden";
        divGame.style.visibility = "hidden";

        //Detect View State
        if (event === 'snapped') {
            canvas.width = SNAPPED_VIEW;
        }
        else if (event === 'filled') {
            canvas.width = FULLSCREEN_WIDTH - SNAPPED_VIEW;
        }
        else {
            canvas.width = FULLSCREEN_WIDTH;
        }
        //Readjust canvas for Snapped/Filled modes
        canvas.height = window.innerHeight;
        SCREEN_HEIGHT = canvas.height;
        SCREEN_WIDTH = canvas.width;

        //Set boundries to be one balloon size
        MAX_X = canvas.width - (BALLOON_WIDTH);
        MAX_Y = canvas.height - (BALLOON_HEIGHT);
        
        //Center Title and Start Button
        var menuX, btnX, btnY;
        menuX = (SCREEN_WIDTH - imgMenu.width) / 2;
        btnX = (SCREEN_WIDTH - btnStart.clientWidth) / 2;
        btnY = (SCREEN_HEIGHT - btnStart.clientHeight) / 2;
        imgMenu.style.posLeft = menuX;
        btnStart.style.posLeft = btnX;
        btnStart.style.posTop = btnY;

        //clear screen and set default background
        ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        document.body.background = MENUBG;

    }

    //Set up Game Screen UI Elements
    function startGame(event) {
        SoundJS.play("startbutton", SoundJS.INTERRUPT_ANY);

        musicGame.play();

        txtPlayerName.style.visibility = "visible";
        txtScore.style.visibility = "visible";
        imgPlayer.style.visibility = "visible";
        imgMenu.style.visibility = "hidden";
        btnStart.style.visibility = "hidden";
        txtLevel.style.visibility = "visible";

        var lvlX = (SCREEN_WIDTH - txtLevel.clientWidth) / 2;
        txtLevel.style.posLeft = lvlX;

        //clear screen
        ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        menuEnabled = false;

    }

    function onViewStateChanged(eventArgs) {
        var viewStates = Windows.UI.ViewManagement.ApplicationViewState, msg;
        var newViewState = Windows.UI.ViewManagement.ApplicationView.value;
        if (newViewState === viewStates.snapped) {
            showMenu('snapped');
        } else if (newViewState === viewStates.filled) {
            showMenu('filled');
        } else if (newViewState === viewStates.fullScreenLandscape) {
            showMenu('landscape');
        } else if (newViewState === viewStates.fullScreenPortrait) {
            //Currently not supported
        }

    }

    //Verify if point was within the bounds of an actual balloon
    function touchHandler(event) {

        if (!menuEnabled) {
            for (var i = 0; i < MAX_BALLOONS; i++) {
                var balloon = balloons[i];
                if (balloonHit(balloon.x, balloon.y, event.x, event.y)) {
                    balloons[i] = destroyBalloon(balloon);
                }
            }
        }
    }

    //Verify pixels clicked by pointer are within bounds of a balloon's drawn pixels
    function balloonHit(balloonX, balloonY, x, y) {
        var maxX = balloonX + BALLOON_WIDTH;
        var maxY = balloonY + BALLOON_HEIGHT;
        if (x >= balloonX && x <= maxX && balloonX >= 0 && y >= balloonY && y <= maxY) {
            return true;
        }
        else {
            return false;
        }

    }

    //Create Balloon Explosion
    function destroyBalloon(balloon) {
        SoundJS.play("explosion", SoundJS.INTERRUPT_ANY);

        var explosion = new Image();
        explosion.onload = function () {
            ctx.drawImage(explosion, balloon.x, balloon.y, balloon.width, balloon.height);
        }
        explosion.src = "/images/explosion.png";
        balloon.img = explosion;
        balloon.destroyed = true;

        updateScore(POINTS_BALLOONHIT);

        return balloon;
    }

    function updateScore(points) {

        score += points;
        txtScore.innerHTML = "  Score: " + score;

        //Check if enough points for BigBoom and turn on Accel if it is
        scoreBigBoom += points;
        if (scoreBigBoom === BIGBOOMPTS_REQ) {
            if (accelerometer != null && accelerometer != undefined) {
                accelerometer.addEventListener("shaken", onShakenAccel);
                txtScore.innerHTML = " > SHAKE YOUR SCREEN FOR BIG BOOM! <";
                SoundJS.play("bigboom", SoundJS.INTERRUPT_ANY);
            }
            scoreBigBoom = 0;
        }

        //new level
        lvlNextPts = (lvlCurrent + 1) * LEVEL_PTS_REQ;
        if (score >= lvlNextPts) {
            lvlCurrent++;
            txtLevel.innerHTML = "Level: " + lvlCurrent;
            lvlDifficulty = LEVEL_SPEED_INCREASE * lvlCurrent;

            SoundJS.play("newlevel", SoundJS.INTERUPT_ANY);

            updateBackground();

        }
    }

    //random background image based on level
    function updateBackground() {
        if (MENUNUM === 4) {
            MENUNUM = 0;
        }
        else {
            MENUNUM++;
        }

        document.body.background = randomBackgroundImg(MENUNUM);
    }

    //Share Contract for High Score
    function shareHighScore(e) {
        var request = e.request;
        var playername = document.getElementById("txtPlayerName");

        request.data.properties.title = SHARE_TITLE;
        request.data.setText('"' + playername.innerHTML + '" has reached ' + txtLevel.innerHTML + ' with ' + txtScore.innerHTML + '!');

    }


    //Event handler for AppBar cmdHome
    function homeAppbar() {
        var viewStates = Windows.UI.ViewManagement.ApplicationViewState, msg;
        var appViewState = Windows.UI.ViewManagement.ApplicationView.value;
        if (appViewState === viewStates.snapped) {
            showMenu('snapped');
        } else if (appViewState === viewStates.filled) {
            showMenu('filled');
        }
        else {
            showMenu('full');
        }
    }

    //Show player name flyout
    function showplayerNameUpdate(event) {
        var cmdNameButton = document.getElementById("cmdName");
        document.getElementById("nameFlyout").winControl.show(cmdNameButton);
    }

    //Change Player Name from Player to custom
    function updateplayerName(event) {
        txtPlayerName.innerHTML = document.getElementById("playerName").value;
        document.getElementById("nameFlyout").winControl.hide();
    }

    function capturePhoto() {
        try {
            var dialog = new Windows.Media.Capture.CameraCaptureUI();
            var aspectRatio = { width: 16, height: 9 };
            dialog.photoSettings.croppedAspectRatio = aspectRatio;
            dialog.captureFileAsync(Windows.Media.Capture.CameraCaptureUIMode.photo).then(function (file) {
                if (file) {
                    imgPlayer.src = URL.createObjectURL(file);

                } else {
                    //No Photo captured
                }
            }, function (err) {
                //
            });
        } catch (err) {
            //
        }
    }

    //Init Accelerometer
    function initAccel() {
        accelerometer = Windows.Devices.Sensors.Accelerometer.getDefault();
        if (accelerometer) {
            // Choose a report interval supported by the sensor
            var minimumReportInterval = accelerometer.minimumReportInterval;
            var reportInterval = minimumReportInterval > 16 ? minimumReportInterval : 16;
            accelerometer.reportInterval = reportInterval;
            getReadingInterval = reportInterval * 2; // double the interval for display (to reduce CPU usage)

        } else {
           // No accelerometer
        }
    }

    //Accelerometer has been shaken and now we need to grant the bonus power
    function onShakenAccel(event) {
        //Stop Listening to Accelerometer
        accelerometer.removeEventListener("shaken", onShakenAccel);

        //Bog Boom! - Destory all balloons
        launchBigBoom();

    }

    //Destroy all the balloons
    function launchBigBoom() {
        for (var i = 0; i < MAX_BALLOONS; i++) {
            balloons[i] = destroyBalloon(balloons[i]);
        }
    }

    app.onactivated = function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // TODO: This application has been newly launched. Initialize
                // your application here.
            } else {
                // TODO: This application has been reactivated from suspension.
                // Restore application state here.
            }
            args.setPromise(WinJS.UI.processAll());
        }
    };
    
    document.addEventListener("DOMContentLoaded", initialize, false);
        
    app.oncheckpoint = function (args) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. You might use the
        // WinJS.Application.sessionState object, which is automatically
        // saved and restored across suspension. If you need to complete an
        // asynchronous operation before your application is suspended, call
        // args.setPromise().
    };

     
    app.start();
})();
