import kmeans from "./kmeans.js";

var audioContext;

var partitionImage = function(context, canvas, rows, columns) {
    var width = canvas.width;
    var height = canvas.height;
    var boxWidth = Math.floor(width / columns);
    var boxHeight = Math.floor(height / rows);

    var partitionedData = [];

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < columns; j++) {
            let rTotal = 0;
            let gTotal = 0;
            let bTotal = 0;
            let aTotal = 0; // don't really care about alpha

            var imageData = context.getImageData(i*boxWidth, j*boxHeight, boxWidth, boxHeight); // get the box of appropriate size
            var pixels = imageData.data;

            for (let i = 0; i < pixels.length; i += 4) {
                rTotal += pixels[i];
                gTotal += pixels[i+1];
                bTotal += pixels[i+2];
                aTotal += pixels[i+3];
            }

            var numPixels = pixels.length/4;
            let rAvg = rTotal / numPixels;
            let gAvg = gTotal / numPixels;
            let bAvg = bTotal / numPixels;
            let aAvg = aTotal / numPixels;

            partitionedData.push(Math.round(rAvg));
            partitionedData.push(Math.round(bAvg));
            partitionedData.push(Math.round(gAvg));
            partitionedData.push(Math.round(aAvg));
        }
    }

    return new Uint8ClampedArray(partitionedData); // Only care about RGB
};

var RGBToHSL = function(data) {
    // https://www.niwa.nu/2013/05/math-behind-colorspace-conversions-rgb-hsl/
    // Returns HSL values for indexes i, i+1, i+2 and removes alpha

    let HSL = [];
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i] / 255;
        let g = data[i+1] / 255;
        let b = data[i+2] / 255;

        let min = Math.min(r, g, b);
        let max = Math.max(r, g, b);

        let l = (min + max) / 2;

        let s = 0;
        if (l <= 0.5) {
            s = (max - min)/(max + min);
        }

        else {
            s = (max - min)/(2.0 - max - min);
        }

        let rmax = r == max;
        let gmax = g == max;
        let bmax = b == max; // figure out which is the max value
        let h = 0;
        if (rmax) {
            h = (g - b)/(max - min);
        }
        else if (gmax) {
            h = 2.0 + (b - r)/(max - min);
        }
        else {
            h = 4.0 + (r-g)/(max - min);
        }
        HSL.push(isFinite(h) ? (h *  60 + 360) % 360 : 0);
        HSL.push(isFinite(s) ? s : 0);
        HSL.push(isFinite(l) ? l : 0);
    }
    return HSL;
};

var startNote = function(gain, freq, lightness, delay) {
    const oscillator = audioContext.createOscillator();
    oscillator.frequency.value = freq;
    oscillator.type = "sine";
    const oscillatorGain = audioContext.createGain();
    oscillator.connect(oscillatorGain);
    oscillatorGain.connect(audioContext.destination);
    oscillatorGain.gain.cancelScheduledValues(delay);
    oscillatorGain.gain.setValueAtTime(0, delay);
    oscillatorGain.gain.linearRampToValueAtTime(gain, delay + (1 - lightness) * .025);
    oscillatorGain.gain.linearRampToValueAtTime(0, delay + .48);
    oscillator.start(delay);
    oscillator.stop(delay + .5);
};

var playNotes = function(data) {
    const freqs = [261.63, 293.67, 329.63, 349.23, 392, 440, 493.89];
    let oscillators = [];
    for (let i = 0; i < data.length; i += 3) {
        const pitch = Math.round(data[i] * 7 / 360) % 7;
        const gain = data[i+1];
        const lightness = data[i+2];
        console.log(pitch, gain, lightness);
        startNote(gain, freqs[pitch], lightness, i / 3 / 2);
    }
};

var loadFile = function(event) {
    if (typeof audioContext !== 'undefined') {
        audioContext.close();
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
    var canvas = document.getElementById('output');
    let context = canvas.getContext('2d');

    let image = new Image();
    image.src = URL.createObjectURL(event.target.files[0]);
    image.onload = function(){
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        let data = partitionImage(context, canvas, 10, 10);
        let pixelData = [];
        for (let i = 0; i < data.length; i += 3) {
            let pixel = [];
            for (let j = 0; j < 3; ++j) {
                pixel.push(isFinite(data[i+j]) ? data[i+j] : 0);
            }
            pixelData.push(pixel);
        }
        let clusterResults = kmeans(pixelData, 5);
        console.log(clusterResults);
        for (let i = 0; i < 5; ++i) {
            const tag = document.getElementById("c" + (i + 1));
            const color = clusterResults.centroids[i];
            if (clusterResults.clusters[i].points.length > 1) {
                console.log(color);
                tag.style.color = "rgb(" + color[0] + ", " + color[1] + ", " + color[2] + ")";
            }
        }
        data = RGBToHSL(data);
        playNotes(data);
    }

    // Loading image into Canvas: https://stackoverflow.com/questions/6011378/how-to-add-image-to-canvas
};

window.loadFile = loadFile;
