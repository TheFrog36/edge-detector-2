const imagePath = "jelly-big.jpeg";
let canvas
let ctx
let imgData
let originalData = []
let originalSlimData = []
let standardDeviation = 3
let boxes = 3
let simplifiedRoberCrossKernel = true
const multiplier = 1

let performance1 
let performance2


let dv = []

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

    if(dv.length == 0) {
        for(i = 0; i < 255 * div; i++) {
            dv.push(i / div)
        }
    }

    yw=yi=0;
    for (y=0;y<height;y++){ 
        graySum = 0
        for(i=-radius;i<=radius;i++){
            p=pix[yi+Math.min(maxWidth,Math.max(i,0))];
            graySum+= p;
            if(p < 0) console.log(p)
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
            // pix[yi]=0xff000000 | (dv[rsum]<<16) | (dv[gsum]<<8) | dv[bsum];
            pix[yi] = ~~dv[~~graySum]
            // if(!dv[graySum]) console.log(graySum)
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
        const res = fastBlur(originalSlimData, 10)

        const dumArr = new Uint8ClampedArray((canvas.width) * (canvas.height) * 4);
        for(let i = 0; i < res.length; i++) {
            dumArr[i * 4] = res[i] * multiplier
            dumArr[i * 4 + 1] = res[i] * multiplier
            dumArr[i * 4 + 2] = res[i] * multiplier
            dumArr[i * 4 + 3] = 255
        }
        const dumData = new ImageData(dumArr, canvas.width, canvas.height)
        ctx.putImageData(dumData, 0, 0)
    
    };

};

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

