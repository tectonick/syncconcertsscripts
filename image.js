
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

//Configuration
const FIRST_FILE_ID=119;
const imagesConfig={
        posterImage:{
            size:500,
            quality:80
        }
}

//Editing function
function posterImage(filepath, readyfilepath){
    return Jimp.read(filepath)
    .then(file => {
      let ext=path.extname(filepath);
      let name=path.basename(filepath,ext);
      let dir=path.dirname(filepath);
      return file.autocrop().resize(imagesConfig.posterImage.size, Jimp.AUTO) // resize
        .quality(imagesConfig.posterImage.quality) // set JPEG quality
        .writeAsync(readyfilepath); //
    })
    .catch(err => {
      throw err;
    });
  
  }

//Main code
  let fileId=FIRST_FILE_ID;
  for (let file of fs.readdirSync('./files').sort(
    (a,b)=>{
        let aId=parseInt(a.split('.')[0]);
        let bId=parseInt(b.split('.')[0]);
        return aId-bId;
    }
  )) {
    posterImage(path.join('./files',file), path.join('./filesedited',`${fileId}.jpg`));
    //fs.copyFileSync(path.join('./files',file), path.join('./filesedited',`${fileId}.jpg`));
    fileId++;
  }