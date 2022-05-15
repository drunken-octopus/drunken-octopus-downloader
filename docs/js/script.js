const fields = ["machine","board","probe","toolhead","display","media","runout"];
const filenameField = 8;
const factoryField  = 7;
const downloadUrl   = "resources/";
const isDesktop     = false;

class ProgressBar {
    static message(msg) {
        document.getElementById("progress").style.visibility = "visible";
        document.getElementById("upload_status").innerText = msg;
    }

    static progress(progress) {
        document.getElementById("progress").style.visibility = "visible";
        document.getElementById("upload_progress").value = progress;
    }

    static hide() {
        document.getElementById("progress").style.visibility = "hidden";
    }
}

async function fetchFile(url, headers) {
    const response = await fetch(url, {headers});
    if (response.ok) {
        return response.arrayBuffer();
    } else {
        throw new Error("Failed to fetch \"" + url + "\" (" + response.status + ")");
    }
}

async function fetchJSON(url, options) {
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
    // Enable buttons
    document.getElementById("upload").disabled = !hasSerial;
    
    // Populate the releases menu
    const el = document.getElementById("release");
    const releases = await fetchFile(downloadUrl + "releases.txt");
    const enc = new TextDecoder("utf-8");
    for(const release of enc.decode(releases).trim().split("\n").reverse()) {
        const opt = document.createElement("option");
        opt.innerText = release;
        el.appendChild(opt);
    }
    onChangeRelease();
}

async function loadRelease(release) {
	try {
		db = await fetchJSON(downloadUrl + release + "/index.json");
		onChange();
	} catch(e) {
		alert("Failed to load release index.");
	}
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
        let first;
        for(const opt of el.children) {
            const okay = set.has(opt.value);
            opt.style.display = okay ? "block" : "none";
            if(!first && okay) first = opt.value;
        }
        // Select the first element if the current element is not selectable
        if(!set.has(el.value)) {
            el.value = first;
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

function onChangeRelease() {
    const release = document.getElementById("release").value;
    document.getElementById("release-notes-link").setAttribute("href","https://github.com/drunken-octopus/drunken-octopus-marlin/releases/tag/v2.0.0.1rc" + release);
    loadRelease(release);
}

function onChange() {
    const btn = document.getElementById("download");
    const premium = document.getElementById("premium");
    const matches = filterMatches();
    const firmware = filterRows(matches);
    if(firmware.length == 1) {
        btn.enabled = true;
        selectedFirmware = firmware[0];
        premium.style.display = selectedFirmware[factoryField] ? "none" : "block";
    } else {
        btn.enabled = false;
        selectedFirmware = undefined;
    }
}

async function getFirmwareFile() {
    try {
        if(selectedFirmware) {
			const release = document.getElementById("release").value;
            const factory = selectedFirmware[factoryField];
            const pass = factory ? "" : document.getElementById("password").value;
            const name = selectedFirmware[filenameField];
            const url = downloadUrl + release + "/" + makeFilename(selectedFirmware, pass);
            const data = await fetchFile(url); // See whether the file exists
            return {data: data, url: url};
        }
    } catch(e) {
        alert("The password is incorrect");
        throw e;
    }
}

async function onDownload() {
    const name = selectedFirmware[filenameField];
    const {data, url} = await getFirmwareFile();
    saveAs(url, name);
}

async function onUpload() {
    const name = selectedFirmware[filenameField];
    const {data, url} = await getFirmwareFile();
    const ext = name.split(".").pop();
    const usb_marlin = {usbVendorId: 0x27B1, usbProductId: 0x0001};
    const usb_samba  = {usbVendorId: 0x03EB, usbProductId: 0x6124};
    const attr = {usb_marlin, usb_samba, data};
    try {
        switch(ext) {
            case "bin": flashFirmwareWithBossa(attr); break;
            case "hex": flashFirmwareWithStk(attr); break;
        }
    } catch(e) {
        alert(e);
    }
}