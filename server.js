var express = require('express');
var app = express();
const puppeteer = require('puppeteer');
var publicDir = require('path').join(__dirname,'public');
app.use(express.static(publicDir));



var http = require('http').createServer(app);
var io = require('socket.io')(http);
var fs = require('fs');
const path = require("path");

const handlebars = require("handlebars");
var upload = require('express-fileupload');
app.use(upload());
app.set('views',path.join(__dirname,'views'));
app.set('view engine','hbs');
app.use(express.static('public')); 

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
  });

  // app.get('/image:name', function(req, res){
  //   res.render('image', { path: req.params.name});
  // });



  app.get('/upload', function (req, res) {
    res.sendFile( __dirname + "/" + "upload.html" );
 })

 app.post('/upload',function(req,res){
    console.log(req.files);
    if(req.files.upfile){
      var file = req.files.upfile,
        name = file.name,
        type = file.mimetype;
      var uploadpath = __dirname + '/uploads/' + name;
      file.mv(uploadpath,function(err){
        if(err){
          console.log("File Upload Failed",name,err);
          res.send("Error Occured!")
        }
        else {
          console.log("File Uploaded",name);
          res.send('Done! Uploading files' + '<a href="/">Back</a>')
        }
      });
    }
    else {
      res.send("No File selected !");
      res.end();
    };
  })
  io.on('connection', function(socket){
    socket.on('chat message', function(msg){
        if(msg == 1){
          io.emit('chat message', "Please enter a product for scrap!");
          socket.on('product', function(product){
            console.log(product);
            scraping(msg,product);
          });
            

            console.log("pdf");
            io.emit('chat message', "Select pdf.");
        }else if(msg == 2){
          io.emit('chat message', "Select csv");

          const path = './uploads/skroutz.csv'

          fs.access(path, fs.F_OK, (err) => {
            if (err) {
              io.emit('chat message', "File doesnot exist.Please first upload csv file");
              console.error(err)
              return
            }
            scraping(msg);
            //file exists
          })
          console.log("CSV");
            
        }else if(msg == 3){
          process.exit(1);
        }
    });
  });
  

http.listen(3000, function(){
  console.log('listening on *:3000');
});


function scraping(method, product = null){
  if(method != 3){
  function readURLFile(path) {
    return fs.readFileSync(path, 'utf-8')
        .split('\n')
        .map((elt) => {
            const url = elt.split(',')[1];
            return url;
        });
  }



  async function autoScroll(page){
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}



async function createPDF(data){
  var context = {
    data: data
  };

  console.log(data);

  console.log(context);
  var templateHtml = fs.readFileSync(path.join(process.cwd(), 'template1.html'), 'utf8');
  var template = handlebars.compile(templateHtml);
  var html = template(context);

  console.log(html);


  var milis = new Date();
  milis = milis.getTime();

  var pdfPath = path.join('public', `${data.name}-${milis}.pdf`);
  
  var fileName = pdfPath.split("\\");
  console.log(fileName);
  io.emit('forPdf', fileName[1]);

  var options = {
    width: '1230px',
    headerTemplate: "<p></p>",
    footerTemplate: "<p></p>",
    displayHeaderFooter: false,
    margin: {
      top: "10px",
      bottom: "30px"
    },
    printBackground: true,
    path: pdfPath
  }


  const browser = await puppeteer.launch({
    args: ['--no-sandbox'],
    headless: true
  });

  var page = await browser.newPage();
  
  await page.goto(`data:text/html;charset=UTF-8,${html}`, {
    waitUntil: 'networkidle0'
  });

  await page.pdf(options);
  await browser.close();
  }

    (async () => {
        const startDate = new Date().getTime();
        const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3239.108 Safari/537.36';
        // const urls = readURLFile('./uploads/skroutz.csv');
        const browser = await puppeteer.launch({
          devtools: false,
          headless: true
          //slowMo: 300
      });
        

        const page2 = await browser.newPage();
        // const result = await page2.evaluate(x => {
        //     var txt;
        //     var product1 = prompt("Dwse thn methodo scraping: 1 for PDF, 2 for csv", "1");
        //     console.log("Start scraping for"+ product1);
        //   return Promise.resolve(product1);
        // }, 7);
    
        if(method == 2){
          
          const urls = readURLFile('./uploads/skroutz.csv');
          $i=0;
        product = [];
        console.log(urls);
            for (let url of urls) {
                if(url ===  undefined )
                {
                    console.log("ENDENDENDEND");
                    break;
                }
                console.log(`Visiting url: ${url}`);
                io.emit('chat message', "Scraping for "+ url);
                
                console.log('Please wait...');
    
                const page = await browser.newPage();
          
                await page.setViewport({ width: 1366, height: 768});
                await page.goto('https://www.skroutz.gr/');
    
                await page.type('#search-bar-input', url);
    
                const buttonSelector = 'button';
                  await page.waitForSelector(buttonSelector);
                await page.click(buttonSelector);
    
                const categorySelector = '.pic';
                await page.waitForSelector(categorySelector);
                if(categorySelector != null) {
                    await page.click(categorySelector);
                }
                io.emit('chat message', "Please wait loading all products");
                await autoScroll(page);
    
                const resultsSelector = 'li.cf > div:nth-child(4) > div:nth-child(1) > div:nth-child(1) > span:nth-child(5) > a:nth-child(1)';
                await page.waitForSelector(resultsSelector);
    
                // Extract the results from the page.
                const links = await page.evaluate(resultsSelector => {
                    const anchors = 
                    Array.from(document.querySelectorAll(resultsSelector));
                    return anchors.map(anchor => {
                      const price = anchor.textContent;
                      //console.log(price);
                      return `${price} - ${anchor.href}`;
                    });
                }, resultsSelector);
                //console.log(links.join('\n'));
                console.log(`Scraping product: ${url}`)
                price = [];
                url1 = [];
                var data = [];
                for(i=0; i<links.length; i++) {	
                    link = links[i].split('-');
                    price[i] = parseFloat(link[0]); 
                    //url1[i] = link[1];
                  data.push([url.replace(/[\r]/g,''), price[i]]);
                }
                //console.log(data);
    
                data.sort(function (a, b) {
                  return a.price1 - b.price1;
                });
                 //console.log(data[0]);
                 io.emit('chat message', "Lower price for"+ data[0]);
                 product.push(data[0]);
            }
            console.log(product);
    
            //console.log(product);
            const page1 = await browser.newPage();
            await page1.setViewport({ width: 1366, height: 768});
            console.log("from csv");
            
            // Here we generate a CSV file and have the browser download it
            const ress = await page1.evaluate((product) => {
                let csvContent = "data:text/csv;charset=utf-8,";
                var convertedArray = [];

                product.forEach(function(item){
                    for(var i = 0; i < item.length; ++i)
                        {
                         convertedArray.push(item[i]);
                         console.log("Arrayarray");
                         console.log(convertedArray);
                        }
    
                        var row = convertedArray.join(';');
                        // console.log(row);
                    csvContent += row + "\r\n";
    
                }); 
                const encodedUri = encodeURI(csvContent);
                // const link1 = document.createElement("a");
                // link1.setAttribute("href", encodedUri);
                // link1.setAttribute("download", "data.csv");
                // document.body.appendChild(link1);

                // return link1.ckick();
                return encodedUri;
            }, product);
                io.emit('chat message1', ress);

        }else if (method == 1){
    
            const page = await browser.newPage();
      
              await page.setViewport({ width: 1366, height: 768});
              await page.goto('https://www.skroutz.gr/');
    
            //   const result = await page.evaluate(x => {
            //     var txt;
            //     var product = prompt("Please enter a product:", "Galaxy A50");
            //     console.log("Start scraping for"+ product);
            //   return Promise.resolve(product);
            // }, 7);

            io.emit('chat message', "Start generate pdf");
    
              await page.type('#search-bar-input', product);
              const buttonSelector = 'button';
              await page.waitForSelector(buttonSelector);
              await page.click(buttonSelector);
    
              const categorySelector = '.pic';
              await page.waitForSelector(categorySelector);
              if(categorySelector != null)
              {
                await page.click(categorySelector);
              }

              await autoScroll(page);
    
              const resultsSelector = 'li.cf > div:nth-child(4) > div:nth-child(1) > div:nth-child(1) > span:nth-child(5) > a:nth-child(1)';
              await page.waitForSelector(resultsSelector);
    
               // Extract the results from the page.
              const links = await page.evaluate(resultsSelector => {
              const anchors = 
              Array.from(document.querySelectorAll(resultsSelector));
                return anchors.map(anchor => {
                  const price = anchor.textContent;
                  //console.log(price);
                  return `${price} - ${anchor.href}`;
                });
            }, resultsSelector);
            //console.log(links.join('\n'));
            price = [];
            url = [];
            var data = [];
            for(i=0; i<links.length; i++)
            {	
                link = links[i].split('-');
                price[i] = parseFloat(link[0]); 
                url[i] = link[1];
              data.push({num : i, price1 : price[i], url1 : url[i], name: product });
            }
            //console.log(data);
    
            data.sort(function (a, b) {
              return a.price1 - b.price1;
            });
    
            console.log("/////////////////////////////////################")
            console.log(data);
    
            const page1 = await browser.newPage();
            await page1.setViewport({ width: 1366, height: 768});
            await page1.goto(data[0].url1, {"waitUntil" : "networkidle2"});
            await page1.waitFor(3000);
            await page1.screenshot({path: "public/"+data[0].name+"1"+'.png', fullPage: true});
            const url1 = page1.url();
            await page1.close();
    
            const page2 = await browser.newPage();
            await page2.setViewport({ width: 1366, height: 768});
            await page2.goto(data[1].url1, {"waitUntil" : "networkidle2"});
            await page2.waitFor(3000);
            await page2.screenshot({path: "public/"+data[1].name+"2"+'.png', fullPage: true});
            const url2 = page2.url();
            await page2.close();
    
            var screenshot = [];
    
            screenshot.push({num : 1, path : "http://localhost:3000/"+data[0].name+"1"+'.png', url :data[0].url1});
    
    
            screenshot.push({num : 2, path : "http://localhost:3000/"+data[1].name+"2"+'.png', url : data[1].url1});
    
    
            console.log(screenshot);
    
    
            await createPDF(screenshot);
    
            //delete file
            fs.unlinkSync("public/"+data[0].name+"1"+'.png');
            fs.unlinkSync("public/"+data[1].name+"2"+'.png');
    
              browser.close();
        }
        
    
    
    
        // // Writing the news inside a json file
        // fs.writeFile("products.csv", JSON.stringify(product), function(err) {
        //   console.log("Saved!");
        // });
        //await browser.close();
        io.emit('chat message', `Time elapsed ${Math.round((new Date().getTime() - startDate) / 1000)} s`);
        console.log(`Time elapsed ${Math.round((new Date().getTime() - startDate) / 1000)} s`);
    
    })();
  }else{
    console.log("exit button");
    return false;
  }
  }