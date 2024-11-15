const images = ['jelly-big.jpeg', 'jelly-small.jpeg', 'sub.jpg', 'sub2.jpg']

const imagePath = images[3];
let canvas
let ctx
let imgData
let originalData = []
let originalSlimData = []
let standardDeviation = 3
let boxes = 3
let simplifiedRoberCrossKernel = true
const multiplier = 1
let dv = []
let performance1 
let performance2
let minTrashold = 60
const maxTrashold = 255

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
        document.querySelector('#standard-deviation').value = standardDeviation
        document.querySelector('#standard-deviation').addEventListener('change', (v) => {
            standardDeviation = v.target.valueAsNumber;
            blur()
        })
        document.querySelector('#boxes').value = boxes
        document.querySelector('#boxes').addEventListener('change', (v) => {
            boxes = v.target.valueAsNumber;
            blur()
        })
        document.querySelector('#trashold').value = minTrashold
        document.querySelector('#trashold').addEventListener('change', (v) => {
            minTrashold = v.target.valueAsNumber;
            blur()
        })


        document.querySelector('#simple-rober-cross').addEventListener('change', (v) => {
            simplifiedRoberCrossKernel = v.target.checked;
            blur()
        })
        document.querySelector('#redo').addEventListener('click', (v) => {
            blur()
        })
    };

};
// pixData compressed data (not rgba, just number array between 0 255 as gray)
function robertCross(pixData, width, height){
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

        }
        t.push(t[t.length-1])
    }
    return t
}

function sobel(pixData, width, height) {
    let t = []
    for(let y = 0; y < height - 2; y++) {
        for(let x = 0; x < width - 2; x++){
            const i = y * width + x
            const p1 = pixData[i]
            const p2 = pixData[i + 1]
            const p3 = pixData[i + 2]
            const p4 = pixData[i + width]
            const p5 = pixData[i + width + 1]
            const p6 = pixData[i + width + 2]
            const p7 = pixData[i + width + width]
            const p8 = pixData[i + width + width + 1]
            const p9 = pixData[i + width + width + 2]
            const gx = -p1 + p3 + (-p4 * 2) + (p6 * 2) - p7 + p9
            const gy = p1 + (p2 * 2) + p3 - p7 - (p8 * 2) - p9
            const magnitude = Math.sqrt(gx * gx + gy * gy)
            t.push(magnitude)
        }
        t.push(t[length-1], t[length-1])
    }
    return t
}

function blur() {
    performance1 = performance.now()
    let t = []
    // gaussBlur_4([...originalSlimData], t, canvas.width, canvas.height)
    t = fastBlur(structuredClone(originalSlimData), standardDeviation)

    // const res = robertCross(structuredClone(t), canvas.width, canvas.height)
    let res = sobel(structuredClone(t), canvas.width, canvas.height)
    res = res.map(e => e < minTrashold ? 0 : 1)
    let changed = true
    let limit = 0
    // const skelResp = skeletonize(res, canvas.width, canvas.height)
    // res = skelResp[0]
    while(changed && limit < 40){
        
        const skelResp = skeletonize(res, canvas.width, canvas.height)
        res = skelResp[0]

        changed = skelResp[1]
        limit++
    }   

    res = thicken(res, canvas.width, canvas.height)

    const dumArr = new Uint8ClampedArray((canvas.width) * (canvas.height) * 4);
    for(let i = 0; i < res.length; i++) {
        dumArr[i * 4] = res[i] * 255
        dumArr[i * 4 + 1] = res[i] * 255
        dumArr[i * 4 + 2] = res[i] * 255
        dumArr[i * 4 + 3] = 255
    }

    const dumData = new ImageData(dumArr, canvas.width, canvas.height)
    ctx.putImageData(dumData, 0, 0)
    performance2 = performance.now()
    console.log(performance2 - performance1)
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
// function boxesForGauss(sigma, n) {
//     var wIdeal = Math.sqrt((12*sigma*sigma/n)+1);  // Ideal averaging filter width 
//     var wl = Math.floor(wIdeal);  if(wl%2==0) wl--;
//     var wu = wl+2;
//     var mIdeal = (12*sigma*sigma - n*wl*wl - 4*n*wl - 3*n)/(-4*wl - 4);
//     var m = Math.round(mIdeal);
//     // var sigmaActual = Math.sqrt( (m*wl*wl + (n-m)*wu*wu - n)/12 );
//     var sizes = [];  for(var i=0; i<n; i++) sizes.push(i<m?wl:wu);
//     return sizes;
// }

// function gaussBlur_4 (scl, tcl, w, h) {
//     var bxs = boxesForGauss(standardDeviation, boxes);
//     boxBlur_4 (scl, tcl, w, h, (bxs[0]-1)/2);
//     boxBlur_4 (tcl, scl, w, h, (bxs[1]-1)/2);
//     boxBlur_4 (scl, tcl, w, h, (bxs[2]-1)/2);
// }

// function boxBlur_4 (scl, tcl, w, h, r) {
//     for(var i=0; i<scl.length; i++) tcl[i] = scl[i];
//     boxBlurH_4(tcl, scl, w, h, r);
//     boxBlurT_4(scl, tcl, w, h, r);
// }

// function boxBlurH_4 (scl, tcl, w, h, r) {
//     var iarr = 1 / (r+r+1);
//     for(var i=0; i<h; i++) {
//         var ti = i*w, li = ti, ri = ti+r;
//         var fv = scl[ti], lv = scl[ti+w-1], val = (r+1)*fv;
//         for(var j=0; j<r; j++) val += scl[ti+j];
//         for(var j=0  ; j<=r ; j++) { val += scl[ri++] - fv       ;   tcl[ti++] = Math.round(val*iarr); }
//         for(var j=r+1; j<w-r; j++) { val += scl[ri++] - scl[li++];   tcl[ti++] = Math.round(val*iarr); }
//         for(var j=w-r; j<w  ; j++) { val += lv        - scl[li++];   tcl[ti++] = Math.round(val*iarr); }
//     }
// }



// function boxBlurT_4 (scl, tcl, w, h, r) {
//     let iarr = 1 / (r+r+1)
//     for(let i=0; i<w; i++) {
//         let ti = i, li = ti, ri = ti+r*w;
//         let fv = scl[ti], lv = scl[ti+w*(h-1)], val = (r+1)*fv;
//         for(var j=0; j<r; j++) 
//             val += scl[ti+j*w];
//         for(var j=0  ; j<=r ; j++){ 
//             val += scl[ri] - fv
//             tcl[ti] = ~~(val*iarr) // tcl[ti] = Math.round(val*iarr)
//             ri+=w; 
//             ti+=w; 
//         }
//         for(var j=r+1; j<h-r; j++){ 
//             val += scl[ri] - scl[li]; 
//             tcl[ti] = ~~(val*iarr);   // tcl[ti] = Math.round(val*iarr);  
//             li+=w; 
//             ri+=w; 
//             ti+=w; 
//         }
//         for(var j=h-r; j<h  ; j++){ 
//             val += lv      - scl[li];  
//             tcl[ti] = ~~(val*iarr);   // tcl[ti] = Math.round(val*iarr);  
//             li+=w; 
//             ti+=w; 
//         }
//     }
// }


function fastBlur(pix, radius) {
    if(radius < 1) return
    const width = canvas.width
    const height = canvas.height
    const maxWidth = width - 1
    const maxHeight = height - 1
    const div = radius * 2 + 1
    const dataLength = height * width
    const gray = new Array(dataLength)
    let graySum, x, y, i, p, p1, p2, yp, yi, yw;
    const vmin = new Array(Math.max(width , height))
    const vmax = new Array(Math.max(width, height))

    // if(dv.length == 0) {
    dv = []
        for(i = 0; i < 255 * div; i++) {
            dv.push(i / div)
        }
    // }

    yw=yi=0;
    for (y=0;y<height;y++){ 
        graySum = 0
        for(i=-radius;i<=radius;i++){
            p=pix[yi+Math.min(maxWidth,Math.max(i,0))];
            graySum+= p;
        }

        for (x=0;x<width;x++){ 
            gray[yi] = dv[graySum]

            if(y==0){
                vmin[x]=Math.min(x+radius+1,maxWidth);
                vmax[x]=Math.max(x-radius,0);
            }
            p1=pix[yw+vmin[x]];
            p2=pix[yw+vmax[x]];
            graySum += p1 - p2
            yi++
        }
        yw+=width
    }
    for (x=0;x<width;x++){
        graySum = 0
        yp = -radius*width
        for(i=-radius;i<=radius;i++){
            yi=Math.max(0,yp)+x;
            graySum+= gray[yi];
            yp+=width;
        }
        yi=x;

        for (y=0;y<height;y++){
            pix[yi] = ~~dv[~~graySum]
            if(x==0){
                vmin[y]=Math.min(y+radius+1,maxHeight)*width;
                vmax[y]=Math.max(y-radius,0)*width;
            }
            p1=x+vmin[y];
            p2=x+vmax[y];

            graySum += gray[p1] - gray[p2]

            yi+=width;
        }
    }
    return pix
    
}




const pat1 = [0,0,0, 2,1,2, 1,1,1]
const pat2 = rotate90(pat1)
const pat3 = rotate90(pat2)
const pat4 = rotate90(pat3)
const pat5 = [2,0,0, 1,1,0, 2,1,2]
const pat6 = rotate90(pat5)
const pat7 = rotate90(pat6)
const pat8 = rotate90(pat7)
const patterns = [pat1, pat2, pat3, pat4, pat5, pat6, pat7, pat8]



function matches(target, current) {
    for(let i = 0; i < target.length; i++){
        if(target[i] == 2) continue
        if(target[i] != current[i]) return 0
    }
    return 1
}

function skeletonize(pix, width, height) {
    let filteredPix = []
    let changed = false
    for(let y = 0; y < height; y ++) {
        for(let x = 0; x < width; x++) {
            const i = y * width + x
            if(pix[i] == 0) {
                filteredPix.push(0)
            } else {
                // sliding window would be good here
                const currentPattern = new Array(9)
                if(x == 0) {
                    currentPattern[0] = undefined
                    currentPattern[3] = undefined
                    currentPattern[6] = undefined
                } else {
                    currentPattern[0] = pix[i - width - 1]
                    currentPattern[3] = pix[i - 1]
                    currentPattern[6] = pix[i + width - 1]
                } 
                if(x == width - 1) {
                    currentPattern[2] = undefined
                    currentPattern[5] = undefined
                    currentPattern[8] = undefined
                } else {
                    currentPattern[2] = pix[i - width + 1]
                    currentPattern[5] = pix[i + 1]
                    currentPattern[8] = pix[i + width + 1]
                } 
                currentPattern[1] = pix[i - width]
                currentPattern[4] = pix[i]
                currentPattern[7] = pix[i + width]
                
                let isMatch = 0
                for(let p = 0; p < patterns.length; p++) {
                    isMatch = matches(patterns[p], currentPattern)
                    if(isMatch) {
                        break
                    }
                }
                if(isMatch) changed = true
                filteredPix.push(!isMatch)
            }
        }
    }
    return [filteredPix, changed]
}


function rotate90(arr) {
    return [arr[6], arr[3], arr[0], arr[7], arr[4], arr[1], arr[8], arr[5], arr[2]]
}

const t1 = [2,2,2, 1,0,2, 2,1,2]
const t2 = rotate90(t1)
const t3 = rotate90(t2)
const t4 = rotate90(t3)
const t5 = [2,2,2, 1,0,1, 2,2,2]
const t6 = rotate90(t5)

const tickPatterns = [t1, t2, t3, t4, t5, t6]
function thicken(pix, width, height) {
    let filteredPix = []

    for(let y = 0; y < height; y ++) {
        for(let x = 0; x < width; x++) {
            const i = y * width + x
            if(pix[i] == 1) {
                filteredPix.push(1)
            } else {
                // sliding window would be good here
                const currentPattern = new Array(9)
                if(x == 0) {
                    currentPattern[0] = undefined
                    currentPattern[3] = undefined
                    currentPattern[6] = undefined
                } else {
                    currentPattern[0] = pix[i - width - 1]
                    currentPattern[3] = pix[i - 1]
                    currentPattern[6] = pix[i + width - 1]
                } 
                if(x == width - 1) {
                    currentPattern[2] = undefined
                    currentPattern[5] = undefined
                    currentPattern[8] = undefined
                } else {
                    currentPattern[2] = pix[i - width + 1]
                    currentPattern[5] = pix[i + 1]
                    currentPattern[8] = pix[i + width + 1]
                } 
                currentPattern[1] = pix[i - width]
                currentPattern[4] = pix[i]
                currentPattern[7] = pix[i + width]
                
                let isMatch = 0
                for(let p = 0; p < tickPatterns.length; p++) {
                    isMatch = matches(tickPatterns[p], currentPattern)
                    if(isMatch) {
                        break
                    }
                }
                filteredPix.push(isMatch)
            }
        }
    }
    return filteredPix
}


