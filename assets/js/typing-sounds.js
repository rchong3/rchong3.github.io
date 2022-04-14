const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();
const keys = [49, 50, 51, 52, 53, 54, 55, 56, 57, 48, 189, 187];
const middleCFreq = 261.63;
let octave = 0;
let gain = 0.1;
let oscillators = {};
let oscillationType = "sine";
let upPressed = false;
let downPressed = false;

$(document).on("keydown", event => {
    console.log(octave);
    if (event.keyCode == 38 && !upPressed) { //up
        console.log("up");
        upPressed = true;
        ++octave;
    } else if (event.keyCode == 40 && !downPressed) { //down
        console.log("down");
        downPressed = true;
        --octave;
    } else {
        const index = keys.indexOf(event.keyCode);
        if (index != -1 && !(event.keyCode in oscillators)) {
            const oscillator = audioContext.createOscillator();
            oscillators[event.keyCode] = oscillator;
            oscillator.connect(analyser);
            oscillator.frequency.value = middleCFreq * Math.pow(2, octave + index / 12);
            oscillator.type = oscillationType; 
            const oscillatorGain = audioContext.createGain();
            oscillator.connect(oscillatorGain);
            oscillatorGain.connect(audioContext.destination);
            oscillatorGain.gain.value = gain;
            oscillator.start();
        }
    }
});

$(document).on("keyup", event => {
    if (event.keyCode == 38 && upPressed) { //up
        upPressed = false;
    } else if (event.keyCode == 40 && downPressed) { //down
        downPressed = false;
    } else if (event.keyCode in oscillators) {
        oscillators[event.keyCode].stop();
        delete oscillators[event.keyCode];
    }
});

$('#oscillation_type').change(function() {
    oscillationType = this.value;
});

$('#gain').change(function() {
    gain = this.value;
});


// Oscilloscope
var analyser = audioContext.createAnalyser();


analyser.fftSize = 2048;
var bufferLength = analyser.frequencyBinCount;
var dataArray = new Uint8Array(bufferLength);

var osc = document.getElementById('oscilloscope');
var oscCtx = osc.getContext('2d');
oscCtx.clearRect(0,0,osc.width,osc.height);

function drawosc(){
	var drawVisual = requestAnimationFrame(drawosc);

	analyser.getByteTimeDomainData(dataArray);
	oscCtx.fillStyle = 'rgb(200,200,200)';
	oscCtx.fillRect(0,0,osc.width,osc.height);
	oscCtx.lineWidth = 2;
	oscCtx.strokeStyle = 'rgb(0,0,0)';
	oscCtx.beginPath();
	var sliceWidth = osc.width * 1.0 /bufferLength;
	var x = 0;
	for(var i =0; i < bufferLength; i++){
		var v = dataArray[i]/128.0;
		var y = v * osc.height/2;

		if(i ===0){
			oscCtx.moveTo(x,y);
		}else{
			oscCtx.lineTo(x,y);
		}
		x += sliceWidth;
	}
	oscCtx.lineTo(osc.width,osc.height/2);
	oscCtx.stroke();
};
drawosc();

// Spectroscope
var spc = document.getElementById('spectroscope');
var spcCtx = spc.getContext('2d');
spcCtx.clearRect(0,0,spc.width,spc.height);

function drawspc(){
	drawVisual = requestAnimationFrame(drawspc);

	analyser.getByteFrequencyData(dataArray);
	spcCtx.fillStyle = 'rgb(0,0,0)';
	spcCtx.fillRect(0,0,spc.width,spc.height);
	
	var barWidth = (spc.width / bufferLength) * 2.5;
	var barHeight;
	var x = 0;

	for(var i =0; i < bufferLength; i++){
		barHeight = dataArray[i]/2;
		spcCtx.fillStyle = 'rgb(255,150,0)';
		spcCtx.fillRect(x,spc.height - barHeight/2,barWidth,barHeight);
		x += barWidth +1;
	}
};
drawspc();
