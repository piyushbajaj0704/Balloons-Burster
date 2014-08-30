function randomRanged(a, b) {
    return (Math.floor(Math.random() * (1 + b - a))) + a;
}

//Random acceleration speed
function randomNumRange(from, to) {
    return Math.floor(Math.random() * (to - from + 1) + from);
}

function randomBackgroundImg(img) {
    var images = Array(1);

    images[0] = "/images/3840x2160.jpg";
    images[1] = "/images/sunset_sky.jpg";
    images[2] = "/images/blue_sky_and_green_grass-wide.jpg";
    images[3] = "/images/blue-sky-landscape-wallpaper.jpg";
    images[4] = "/images/2012-10-06_SM-Beach-Sunset-183.jpg";
    
    return images[img];
}

