const imagePath = "jelly-small.jpeg";
let canvas
let ctx
let imgData
let originalData = []
let originalSlimData = []
let standardDeviation = 3
let boxes = 3
let simplifiedRoberCrossKernel = true

window.onload = function() {
    const img = new Image();
    img.src = imagePath;
    img.onload = function () {
        originalImage = img;
        canvas = document.getElementById('original-canvas');
        ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        grayScale(ctx, imgData)
        originalData = structuredClone(imgData.data)
        for(let i = 0; i < originalData.length; i+=4){
            originalSlimData.push(originalData[i])
        }
        blur()

        document.querySelector('#standard-deviation').addEventListener('change', (v) => {
            standardDeviation = v.target.valueAsNumber;
            blur()
        })
        document.querySelector('#boxes').addEventListener('change', (v) => {
            boxes = v.target.valueAsNumber;
            blur()
        })

        document.querySelector('#simple-rober-cross').addEventListener('change', (v) => {
            simplifiedRoberCrossKernel = v.target.checked;
            blur()
        })

    };

};
// pixData compressed data (not rgba, just number array between 0 255 as gray)
function test(pixData, width, height){
    let operation
    if(simplifiedRoberCrossKernel) {
        operation = (p1,p2,p3,p4) => Math.abs(p1 - p4) + Math.abs(p2 - p3)
    } else {
        operation = (p1,p2,p3,p4) => {
            const gx = p1 - p4
            const gy = p2 - p3
            return Math.sqrt(gx * gx + gy * gy);
        }
    }
    let t = []
    for(let y = 0; y < height - 1; y++) {
        for(let x = 0; x < width - 1; x++){
            const i = y * width + x
            const p1 = pixData[i]
            const p2 = pixData[i+1]
            const p3 = pixData[i + width]
            const p4 = pixData[i + width + 1]
            t.push(operation(p1,p2,p3,p4))

            // let Gx = p1 - p4; // Gx = (I(i, j) - I(i+1, j+1))
            // let Gy = p2 - p3; // Gy = (I(i, j+1) - I(i+1, j))
            // let magnitude = Math.sqrt(Gx * Gx + Gy * Gy);
            // t.push(magnitude)
        }
        // t.push(t[t.length-1])
    }
    return t
}

function blur() {
    const t = []
    gaussBlur_4([...originalSlimData], t, canvas.width, canvas.height)

    for(let i = 0; i < t.length; i++) {
        imgData.data[i * 4] = t[i]
        imgData.data[i * 4 + 1] = t[i]
        imgData.data[i * 4 + 2] = t[i]
    }
    const res = test(structuredClone(t), canvas.width, canvas.height)

    const dumArr = new Uint8ClampedArray((canvas.width - 1) * (canvas.height- 1) * 4);
    for(let i = 0; i < res.length; i++) {
        dumArr[i * 4] = res[i] * 50
        dumArr[i * 4 + 1] = res[i] * 50
        dumArr[i * 4 + 2] = res[i] * 50
        dumArr[i * 4 + 3] = 255
    }

    const dumData = new ImageData(dumArr, canvas.width- 1, canvas.height- 1)
    ctx.putImageData(dumData, 0, 0)
    // ctx.putImageData(imgData, 0, 0)



}

function grayScale(ctx, imgData) {
    const pixels = imgData.data;
    for (var i = 0; i < pixels.length; i += 4) {

        let lightness = parseInt((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3);
    
        pixels[i] = lightness;
        pixels[i + 1] = lightness;
        pixels[i + 2] = lightness;
    }
    ctx.putImageData(imgData, 0, 0);
    return imgData
}
// standard deviation, number of boxes
function boxesForGauss(sigma, n) {
    var wIdeal = Math.sqrt((12*sigma*sigma/n)+1);  // Ideal averaging filter width 
    var wl = Math.floor(wIdeal);  if(wl%2==0) wl--;
    var wu = wl+2;
    var mIdeal = (12*sigma*sigma - n*wl*wl - 4*n*wl - 3*n)/(-4*wl - 4);
    var m = Math.round(mIdeal);
    // var sigmaActual = Math.sqrt( (m*wl*wl + (n-m)*wu*wu - n)/12 );
    var sizes = [];  for(var i=0; i<n; i++) sizes.push(i<m?wl:wu);
    return sizes;
}

function gaussBlur_4 (scl, tcl, w, h) {
    var bxs = boxesForGauss(standardDeviation, boxes);
    boxBlur_4 (scl, tcl, w, h, (bxs[0]-1)/2);
    boxBlur_4 (tcl, scl, w, h, (bxs[1]-1)/2);
    boxBlur_4 (scl, tcl, w, h, (bxs[2]-1)/2);
}

function boxBlur_4 (scl, tcl, w, h, r) {
    for(var i=0; i<scl.length; i++) tcl[i] = scl[i];
    boxBlurH_4(tcl, scl, w, h, r);
    boxBlurT_4(scl, tcl, w, h, r);
}

function boxBlurH_4 (scl, tcl, w, h, r) {
    var iarr = 1 / (r+r+1);
    for(var i=0; i<h; i++) {
        var ti = i*w, li = ti, ri = ti+r;
        var fv = scl[ti], lv = scl[ti+w-1], val = (r+1)*fv;
        for(var j=0; j<r; j++) val += scl[ti+j];
        for(var j=0  ; j<=r ; j++) { val += scl[ri++] - fv       ;   tcl[ti++] = Math.round(val*iarr); }
        for(var j=r+1; j<w-r; j++) { val += scl[ri++] - scl[li++];   tcl[ti++] = Math.round(val*iarr); }
        for(var j=w-r; j<w  ; j++) { val += lv        - scl[li++];   tcl[ti++] = Math.round(val*iarr); }
    }
}

function boxBlurT_4 (scl, tcl, w, h, r) {
    var iarr = 1 / (r+r+1);
    for(var i=0; i<w; i++) {
        var ti = i, li = ti, ri = ti+r*w;
        var fv = scl[ti], lv = scl[ti+w*(h-1)], val = (r+1)*fv;
        for(var j=0; j<r; j++) val += scl[ti+j*w];
        for(var j=0  ; j<=r ; j++) { val += scl[ri] - fv     ;  tcl[ti] = Math.round(val*iarr);  ri+=w; ti+=w; }
        for(var j=r+1; j<h-r; j++) { val += scl[ri] - scl[li];  tcl[ti] = Math.round(val*iarr);  li+=w; ri+=w; ti+=w; }
        for(var j=h-r; j<h  ; j++) { val += lv      - scl[li];  tcl[ti] = Math.round(val*iarr);  li+=w; ti+=w; }
    }
}