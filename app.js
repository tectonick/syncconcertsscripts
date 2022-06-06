const http = require('http');
const fetch=require('node-fetch');
const jsdom=require('jsdom');
const { domainMatch } = require('tough-cookie');
const { JSDOM } = jsdom;
const fs = require('fs');

const PAGES_COUNT = 4; //4
const BASE_ARCHIVE_URL= 'https://philharmonic.by/ru/arhivisp/913?page=';
const BASE_URL='https://philharmonic.by';
const FIRST_FILE_ID=1;
const LAST_LINK='https://philharmonic.by/ru/concert/gosudarstvennyy-kamernyy-orkestr-zakrytie-sezona';
const virtualConsole = new jsdom.VirtualConsole();





//Main function
async function run(){    
    //Get all links from archive
    let links=getLinksFromArchive();
    //getting concert data from links
    let concerts=createConcertsFromLinks(links);
    //create sql query for each concert and write it to disk
    writeSqlQueryToDisk(concerts, 'sql.txt');
    //write images to disk
    writeImagesToDisk(concerts);
}
run();



function getLinksFromArchive(){
    let links=[];
    for (let i = 0; i < PAGES_COUNT; i++) {
     let currentPage= BASE_ARCHIVE_URL + i;
     let currentPageData = await fetch(currentPage).then(res => res.text());
     let {document} = new JSDOM(currentPageData,{virtualConsole}).window;
     for (let item of document.querySelectorAll('.views-field-title a')){
        let link =BASE_URL+item.href;
        links.push(link);
        if(link===LAST_LINK){
            break;
        }        
     }
    }
    return links;
}

function createConcertsFromLinks(links){
    let concerts=[];
    for (let link of links) {
        let {document} = new JSDOM(await fetch(link).then(res => res.text()),{virtualConsole}).window;
        let title=document.querySelector('h1.page-header').textContent;
        let regex=/(отмен(е|ё)н|перенес(е|ё)н)/gi;
        if (regex.test(title)){
            continue;
        }
        let dateString =document.querySelector('.date-display-single').getAttribute('content');
        let date=dateString.slice(0, 19).replace('T', ' ');
        let placeString= document.querySelector('.views-field-field-hall a').textContent;
        let place=(placeString==='Большой концертный зал'? 'Большой зал БГФ':'Малый зал БГФ');
        let descriptionString= document.querySelector('.views-field-body .field-content').innerHTML;
        descriptionString=descriptionString.replace(/\n\n/g, '').replace(/<br(\/)?>/g, '');
        let description=mysql_real_escape_string(descriptionString);
        let image=document.querySelector('.view-id-concerto img')?.src;
        let concert = {
            title,
            date,
            place,
            description,
            image,
            ticket: link
       };
        concerts.push(concert);
    }
    return concerts;

}

function writeSqlQueryToDisk(concerts, filename){
    let sqlQuery='START TRANSACTION;\n';
    for (let concert of concerts) {
        sqlQuery+=`INSERT INTO concerts (id, title, date, description, place, ticket, hidden) VALUES (0, '${concert.title}', '${concert.date}', '${concert.description}', '${concert.place}', '${concert.ticket}', 0);\n`;
    }
    sqlQuery+='COMMIT;';
    fs.writeFileSync(filename, sqlQuery);
}

function writeImagesToDisk(){
    let fileId=FIRST_FILE_ID;
    for (let concert of concerts) {
        let fileName=`${fileId}.jpg`;
        let filePath=`./files/${fileName}`;

        if (!concert.image){
            fs.copyFileSync('./placeholder.jpg', filePath);
        } else{
            let file= await fetch(concert.image).then(res=>res.buffer());
            fs.writeFileSync(filePath,file); 
        }
        fileId++;   
    }
}
//Helper string escape function
function mysql_real_escape_string (str) {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\"+char; // prepends a backslash to backslash, percent,
                                  // and double/single quotes
        }
    });
}

