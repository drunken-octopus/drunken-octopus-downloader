/**
 * WebSlicer
 * Copyright (C) 2020  SynDaver Labs, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
const usb_marlin = {usbVendorId: 0x27B1, usbProductId: 0x0001};
const usb_samba  = {usbVendorId: 0x03EB, usbProductId: 0x27B1};

async function flashFirmwareWithBossa(data) {
    ProgressBar.message("Downloading firmware");
    const bossa        = await import('../lib/serial-tools/bossa/bossa.js');
    const programmer   = new bossa.BOSSA();
    try {
        ProgressBar.message("Finding printers");
        programmer.onProgress = ProgressBar.progress;

        let port = await SequentialSerial.requestPort([usb_marlin, usb_samba]);

        // Check to see if we need to reset the printer to the bootloader
        const usbInfo = port.getInfo();
        console.log(usbInfo);
        if(usbInfo.usbVendorId  == usb_marlin.usbVendorId &&
           usbInfo.usbProductId == usb_marlin.usbProductId) {
            await programmer.reset_to_bootloader(port);
            if(isDesktop) {
                port = await SequentialSerial.requestPort([usb_samba]);
            } else {
                // With the web version, the browser requires a new button click to allow us to open another device.
                alert("The printer is now ready for upgrading.\nClick the \"Upgrade\" button once again to proceed.\n\nThe printer's display may fade out during this process (this is normal)");
                return;
            }
        }
        await programmer.connect(port);
        ProgressBar.message("Writing firmware");
        await programmer.flash_firmware(data);
        ProgressBar.message("Verifying firmware");
        await programmer.verify_firmware(data);
        await programmer.enable_boot_flag();
    } catch(e) {
        if(e instanceof DOMException) {
            if(isDesktop) {
                throw Error("No printers found");
            }
        } else {
            console.error(e);
        }
    } finally {
        ProgressBar.hide();
        await programmer.reset_and_close();
    }
}

async function flashFirmwareWithStk(data) {
    const stk          = await import('../lib/serial-tools/avr-isp/stk500v2.js');
    const hex          = await import('../lib/serial-tools/avr-isp/intelHex.js');
    const programmer   = new stk.Stk500v2();
    const firmware     = hex.IntelHex.decode(data);
    try {
        ProgressBar.message("Finding printers");
        programmer.onProgress = ProgressBar.progress;

        let port = await SequentialSerial.requestPort([usb_marlin]);
        await programmer.connect(port);
        ProgressBar.message("Writing firmware");
        await programmer.flash_firmware(firmware);
        ProgressBar.message("Verifying firmware");
        await programmer.verify_firmware(firmware);
        await programmer.reset_and_close();
    } catch(e) {
        if(e instanceof DOMException) {
            if(isDesktop) {
                throw Error("No printers found");
            }
        } else {
            console.error(e);
        }
    } finally {
        ProgressBar.hide();
    }
}