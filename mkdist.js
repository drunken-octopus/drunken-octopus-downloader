const fs = require('fs').promises;
const ff = require('file-regex');
const resourcePath = "docs/resources";

// https://stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript
const hashJoaat=function(b){for(var a=0,c=b.length;c--;)a+=b.charCodeAt(c),a+=a<<10,a^=a>>6;a+=a<<3;a^=a>>11;return((a+(a<<15)&4294967295)>>>0).toString(16)};

function makeFilename(attr, pass = "") {
    return hashJoaat(attr.join() + pass);
}

async function makeDist(dir, release, pass) {
    const result = [];
    const files = await ff(dir, /(\.hex|\.bin)$/, 10);

	await fs.mkdir(resourcePath + "/" + release);

    for(let {dir, file} of files) {
        const [_,machine_code,machine_name,toolhead_code,toolhead_name,version] = file.split("_");

        // Determine the board type
        let board = "Standard";
        if(machine_name.includes("Archim")) board = "Archim";
        if(machine_name.includes("Einsy")) board = "Einsy";

        // Determine the probing type
        let probe = "Standard";
        if(machine_name.includes("BLTouch")) probe = "BLTouch";

        // Determine the LCD type
        let display = "Standard";
        const regex = new RegExp('[^B][^L]Touch');
        if(machine_name.includes("LCD")) display = "LCD";
        if(regex.test(machine_name)) display = "Touch";

        // Determine the card type
        let media = "Standard";
        if(machine_name.includes("SD")) media = "SD";
        if(machine_name.includes("USB")) media = "USB";
        
        // Determine the runout sensor type
        let runout = "Standard";
        if(machine_name.includes("HallEffect")) runout = "Magnetic";
        
        // Determine if this is a factory build
        let factory = dir.includes("standard");

        const attr = [machine_code, board, probe, toolhead_code, display, media, runout, factory, file]; 
        result.push(attr);

        const path = resourcePath + "/" + release + "/" + makeFilename(attr, factory ? "" : pass);
        // Copy the binary file over to the resources directory
        await fs.copyFile(dir + "/" + file, path);
        console.log("Writing", path);
    }
    await fs.writeFile(resourcePath + "/" + release + "/index.json", JSON.stringify(result));
    await fs.appendFile(resourcePath + "/releases.txt", "\n" + release);
    console.log();
}

if(process.argv.length == 5) {
    makeDist(process.argv[2], process.argv[3], process.argv[4]);
} else {
    console.log(process.argv[0], process.argv[1], "[directory] [release] [password]");
}