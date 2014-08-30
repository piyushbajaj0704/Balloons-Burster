
function Balloon(MAX_X, MAX_Y, MIN_ACCEL, MAX_ACCEL, LVL_MULTIPLY) {

    this.x = Math.random() * MAX_X;
    this.y = Math.random() * MAX_Y;

    var speed = randomRanged(MIN_ACCEL, MAX_ACCEL);
    var extra = speed * LVL_MULTIPLY;

    this.accel = speed + extra;
    this.img = new Image();
    this.img.src = randomImg(this.img);
    this.destroyed = false;
    this.destroyRendered = 0;

    this.height = 200;
    this.width = 327;
};

function randomRanged(a, b) {
    return (Math.floor(Math.random() * (1 + b - a))) + a;
}

function randomImg() {
    var images = Array(1);

    images[0] = "/images/balloon-black.png";
    images[1] = "/images/balloon-blue.png";
    images[2] = "/images/balloon-green.png";
    images[3] = "/images/balloon-orange.png";
    images[4] = "/images/balloon-purple.png";
    images[5] = "/images/balloon-red.png";
    var ran = randomRanged(0, 5);

    return images[ran];
}