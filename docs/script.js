const fields = ["machine","toolhead","board","probe","display","media","runout"];
const filenameField = 8;
const premiumField  = 7;
//const downloadUrl   = "resources/";
const downloadUrl = "https://github.com/drunken-octopus/drunken-octopus-downloader/releases/latest/download/"

async function fetchFile(url) {
    const response = await fetch(url);
    if (response.ok) {
        return response.arrayBuffer();
    } else {
        throw new Error("Failed to fetch \"" + url + "\" (" + response.status + ")");
    }
}

async function fetchJSON(url) {
    const response = await fetch(url);
    if (response.ok) {
        return response.json();
    } else {
        throw new Error("Failed to fetch \"" + url + "\" (" + response.status + ")");
    }
}

// https://stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript
const hashJoaat=function(b){for(var a=0,c=b.length;c--;)a+=b.charCodeAt(c),a+=a<<10,a^=a>>6;a+=a<<3;a^=a>>11;return((a+(a<<15)&4294967295)>>>0).toString(16)};

function makeFilename(attr, pass = "") {
    return hashJoaat(attr.join() + pass);
}

async function onLoad() {
    db = await fetchJSON("resources/index.json");
    onChange();
}

function filterRows(matches) {
    var result = [];
    forMatches(matches, row => result.push(row))
    return result;
}

function forMatches(matches, func) {
    for(const [i,row] of db.entries()) {
        if(matches[i]) {
            func(row);
        }
    }
}

function filterMatches() {
    const matches = Array(db.length).fill(true);
    for(const [i,field] of fields.entries()) {
        const el = document.getElementById(field);
        const set = new Set();
        // Figure out which options should be visible
        forMatches(matches, row => set.add(row[i]));
        // Only show the ones that are still part of the match set
        for(const opt of el.children) {
            opt.style.display = set.has(opt.value) ? "block" : "none";
        }
        // Select the first element if the current element is not selectable
        if(!set.has(el.value)) {
            const firstElement = set.values().next().value;
            el.value = firstElement;
        }
        // Filter the match set by the selection
        for(const [j,row] of db.entries()) {
            if(row[i] != el.value) {
                matches[j] = false;
            }
        }
    }
    return matches;
}

function onChange() {
    const btn = document.getElementById("download");
    const premium = document.getElementById("premium");
    const matches = filterMatches();
    const firmware = filterRows(matches);
    if(firmware.length == 1) {
        btn.enabled = true;
        selectedFirmware = firmware[0];
        premium.style.display = selectedFirmware[premiumField] ? "block" : "none";
    } else {
        btn.enabled = false;
        selectedFirmware = undefined;
    }
}

async function onDownload() {
    if(selectedFirmware) {
        const pass = selectedFirmware[premiumField] ? document.getElementById("password").value : "";
        const name = selectedFirmware[filenameField];
        const path = downloadUrl + makeFilename(selectedFirmware, pass);
        try {
            await fetchFile(path); // Check for existence
            saveAs(path, name);
        } catch(e) {
            alert("The password is incorrect");
        }
    }
}