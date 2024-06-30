// ==UserScript==
// @name         Arras.io mod pack
// @namespace    arras.io.modpack
// @version      2024-06-25
// @description  This code edits some of the code in arras.io, it required arras.io/mod to be opened
// @author       Sandbox status (Ric, EvilMaster), kuoworic on Discord
// @match        *://arras.io/mod*
// @icon         https://arras.io/favicon/base.svg
// @grant        none
// ==/UserScript==

/*
    what this does is that it looks for the async function defined and called in the index page and replaces it with a custom one
    i would have liked to do code injection of some sort but it seems too hard

    look for `return[!1,Function(r)()]` and add
    `if(r == "return typeof ramp.addUnits")return [!1, "function"];` before it, that's what it's being done here
*/
let settings_open = false;
let update_events = [];
let menu_open = "Options";
let menu_events = []

function trigger_settings(){
    settings_open = !settings_open;
    update_events.push(settings_open);
}

function open_menu(title){
    menu_open = title;
    menu_events.push(title);
}

(function() {
    'use strict';

    function add_custom_arras(){
        fetch("/").then((a)=>{return a.text()}).then((a)=>{
            let main_page = (new DOMParser()).parseFromString(a,"text/html");

            let targetScript = null;
            main_page.querySelectorAll('script').forEach(script => {
                if (script.textContent.includes('(async()=>')) {
                    targetScript = script;
                }
            });

            if (targetScript) {
                let modified_script = targetScript.textContent.replaceAll('if(!r.isTrusted)return;','');
                modified_script = modified_script.replaceAll('t.isTrusted','true');
                //modified_script = modified_script.replaceAll('.preventDefault()','');
                modified_script = modified_script.replaceAll('fetch("/CHANGELOG.md")','fetch("../CHANGELOG.md")');
                modified_script = modified_script.replaceAll('fetch("./app.wasm")','fetch("../app.wasm")');
                modified_script = modified_script.replaceAll('return[!1,Function(r)()]','if(r == "return typeof ramp.addUnits")return [!1, "function"];return[!1,Function(r)()]');

                const main_script_content = modified_script;

                const main_script = document.createElement('script');
                main_script.textContent = main_script_content;

                document.body.innerHTML = "";
                document.head.innerHTML = "";
                document.head.innerHTML = main_page.head.innerHTML;
                document.body.appendChild(main_script);
            }


        });
    }
    if(window.location.pathname == "/mod" || window.location.pathname == "/mod/"){
        window.history.pushState({}, null, "/mod/"+window.location.hash);


        document.body.innerHTML = "";
        document.head.innerHTML = "<style>body{background-color:#484848;}</style>";
        add_custom_arras();

        let deathscreenop = false;
        let isdown = {};

        function update_key(key){
            let code = isdown[key].code;
            let keycode = isdown[key].keycode;
            let e = new KeyboardEvent(isdown[key].keydown?"keydown":"keyup", {"key": key, "code": code, "keyCode": keycode, "which": keycode, "bubbles": true, "cancelable": true, "composed": true, "view": window, "returnValue": false, "target": document.body});
            //console.log(e);
            document.body.dispatchEvent(e);
        }

        function toggle_key_state(key,code,keycode){
            if(!(isdown[key])){
                isdown[key] = {"keydown":false};
            }
            isdown[key] = {"key":key,"code":code,"keycode":keycode,"keydown":!(isdown[key].keydown)};
            update_key(key);
        }

        let int_it = 0;

        function hold_down_keys(){
            if(int_it%5 == 0){
                for(const [key, keydata] of Object.entries(isdown)){
                    if(keydata.keydown){
                        update_key(key);
                    }
                }
            }
            if(deathscreenop){
                if(int_it%1650 == 0){
                    toggle_key_state("Enter","Enter",13);
                    toggle_key_state("Enter","Enter",13);
                }else{
                    if(int_it%16 == 0){
                        toggle_key_state("o","KeyO",79);
                        toggle_key_state("o","KeyO",79);
                    }
                }
            }
        }

        // does mousedown then mouse up
        function mouse_press(x,y, canvas){
            let options = {"bubbles":true, "button":0, "buttons":1, "cancelable": true, "clientX":x, "clientY":y, "composed":true, "detail":1, "eventPhase":0, "layerX":10, "layerY":10, "movementX":0, "movementY":0,
                           "returnValue":true, "which":1, "view": window, "target":canvas};
            let e = new MouseEvent("mousedown",options);
            canvas.dispatchEvent(e);
            e = new MouseEvent("mouseup",options);
            canvas.dispatchEvent(e);
        }

        let main_menu = false;
        let settings_pos_x = -600;
        let settings_menu_x = -3;
        //settings_open
        function keep_settings_button(){
            let menu_options = {"Options":0,"Theme":1,"Keybinds":2,"Secrets":3,"Mod":4};

            let canvas = document.getElementById("canvas");
            if(canvas){
                canvas = canvas.querySelector('canvas');
                while(update_events.length > 0){
                    let action = update_events.pop();
                    mouse_press(action?5:30,20 ,canvas);
                }
                while(menu_events.length > 0){
                    let action = menu_options[menu_events.pop()];
                    if(action == 4) action = 3;
                    if(action < 3){
                        mouse_press(action*135+90,30 ,canvas);
                    }else{
                        mouse_press(action*110+90,30 ,canvas);
                    }
                }
            }

            let settings_button = undefined;
            if(document.body.querySelectorAll('button').length == 0){
                settings_button = document.createElement("BUTTON");
                settings_button.textContent = "";
                settings_button.style["z-index"] = 513;
                settings_button.style["background-color"] = "#00000000";
                settings_button.style.position = "absolute";
                settings_button.style.top = "18";
                settings_button.style.left = "0";
                settings_button.style.height = "32";
                settings_button.style.border = "0";
                settings_button.style.padding = "0";
                settings_button.onclick = trigger_settings;
                settings_button.tabIndex = -1;
                document.body.appendChild(settings_button);
            } else {
                settings_button = document.body.querySelectorAll('button')[0];
            }
            settings_button.style.width = settings_open?"32":(main_menu?"80":"15");
            settings_button.style.left = settings_open?"18":"0";

            let menu_width = 409.5;
            if(!document.getElementById('mod_panel')){
                let mod_panel = document.createElement("div");
                mod_panel.id = "mod_panel";
                mod_panel.style["z-index"] = 511;
                mod_panel.style["background-color"] = "#635f5f";
                mod_panel.style.position = "absolute";
                mod_panel.style.display = "flex";
                mod_panel.style.top = "18";
                mod_panel.style.left = settings_pos_x;
                mod_panel.style.height = "52";
                mod_panel.style.width = menu_width;
                mod_panel.style.border = "solid";
                mod_panel.style["border-radius"] = "3px";
                mod_panel.style["border-color"] = "#131313";
                mod_panel.style["border-right-style"] = "none";
                mod_panel.style["border-bottom-style"] = "none";
                mod_panel.style.padding = "0";
                document.body.appendChild(mod_panel);

                let mod_panel_style = document.createElement("style");
                mod_panel_style.textContent = 'div.settings_menu {background-color:#524f4f;}div.settings_menu:hover {background-color:#696767;}';
                mod_panel.appendChild(mod_panel_style);

                for(const title of ["Options","Theme","Keybinds","Secrets","Mod"]){
                    let mod_panel_page = document.createElement("div");
                    mod_panel_page.onclick = ()=>{open_menu(title)};
                    mod_panel_page.classList.add('settings_menu');
                    mod_panel_page.style["z-index"] = 512;
                    //mod_panel_page.style["background-color"] = "#524f4f";//#696767
                    mod_panel_page.style.position = "relative";
                    mod_panel_page.style.display = "table-cell";
                    mod_panel_page.style.float = "right";
                    mod_panel_page.style.top = "0";
                    //mod_panel_page.style.left = settings_pos_x;
                    mod_panel_page.style.height = "47";
                    mod_panel_page.style.width = "20%";
                    mod_panel_page.style["border-right-style"] = "solid";
                    mod_panel_page.style["border-bottom-style"] = "solid";
                    mod_panel_page.style["border-radius"] = "0px";
                    mod_panel_page.style["border-color"] = "#131313";
                    mod_panel_page.style.padding = "0";

                    let mod_panel_page_text = document.createElement("p");
                    mod_panel_page_text.onclick = ()=>{open_menu(title)};
                    mod_panel_page_text.style.pointerEvents = "none";
                    mod_panel_page_text.style["z-index"] = 516;
                    mod_panel_page_text.style.fontFamily = '"Ubuntu", sans-serif';
                    mod_panel_page_text.style.fontWeight = "700";
                    mod_panel_page_text.style.fontSize = "15px";
                    mod_panel_page_text.style.color = "#f2f2f2";
                    mod_panel_page_text.style["text-align"] = "center";
                    let shadow_color = "#131313";
                    // idc, this is bad, but idc
                    mod_panel_page_text.style["text-shadow"] = `-1px -1px 0 ${shadow_color}, 1px -1px 0 ${shadow_color}, -1px 1px 0 ${shadow_color}, 1px 1px 0 ${shadow_color}, 0px -2px 0 ${shadow_color}, 0px 2px 0 ${shadow_color}, -2px 0px 0 ${shadow_color}, 2px 0px 0 ${shadow_color}`;
                    mod_panel_page_text.textContent = title;
                    mod_panel_page_text.style.position = "absolute";
                    mod_panel_page_text.style.display = "table-cell";
                    mod_panel_page_text.style.left = `calc(${menu_options[title]*20}% - 1.5px)`;
                    mod_panel_page_text.style.width = "20%";
                    mod_panel_page_text.style["background-color"] = "#00000000";
                    mod_panel_page_text.style.border = "none";


                    mod_panel.appendChild(mod_panel_page);
                    mod_panel.appendChild(mod_panel_page_text);
                }

                let mod_panel_selected = document.createElement("div");
                mod_panel_selected.id = "mod_panel_selected";
                mod_panel_selected.style["z-index"] = 514;
                mod_panel_selected.style["background-color"] = "#635f5f";
                mod_panel_selected.style.position = "absolute";
                mod_panel_selected.style.display = "table-cell";
                mod_panel_selected.style.float = "right";
                mod_panel_selected.style.top = "0";
                mod_panel_selected.style.left = settings_menu_x;
                mod_panel_selected.style.height = "50";
                mod_panel_selected.style.width = "calc(20% - 3px)";
                mod_panel_selected.style["border-right-style"] = "solid";
                mod_panel_selected.style["border-left-style"] = "solid";
                mod_panel_selected.style["border-radius"] = "0px";
                mod_panel_selected.style["border-color"] = "#131313";
                mod_panel_selected.style.padding = "0";
                mod_panel.appendChild(mod_panel_selected);

                let mod_panel_bottom = document.createElement("div");
                mod_panel_bottom.style["z-index"] = 515;
                mod_panel_bottom.style["background-color"] = "#00000000";//"#635f5f";
                mod_panel_bottom.style.position = "absolute";
                mod_panel_bottom.style.display = "table-cell";
                mod_panel_bottom.style.float = "right";
                mod_panel_bottom.style.top = "50";
                mod_panel_bottom.style.left = settings_menu_x-1;
                mod_panel_bottom.style.height = "2";
                mod_panel_bottom.style.width = "calc(100% - 3px)";
                mod_panel_bottom.style["border-right-style"] = "solid";
                mod_panel_bottom.style["border-left-style"] = "solid";
                mod_panel_bottom.style["border-right-color"] = "#131313";
                mod_panel_bottom.style["border-left-color"] = "#635f5f";
                mod_panel_bottom.style.padding = "0";
                mod_panel.appendChild(mod_panel_bottom);

            }


            // this is the Mod page
            if(!document.getElementById('mod_page')){
                let mod_page = document.createElement("div");
                mod_page.id = "mod_page";
                mod_page.style["z-index"] = 510;
                mod_page.style["background-color"] = "#635f5f";
                mod_page.style.position = "absolute";
                mod_page.style.display = "flex";
                mod_page.style.top = "68";
                mod_page.style.left = settings_pos_x-50;
                mod_page.style.height = "648";
                mod_page.style.width = menu_width+50-3;
                mod_page.style.border = "solid";
                mod_page.style["border-radius"] = "3px";
                mod_page.style["border-color"] = "#131313";
                //mod_page.style["border-right-style"] = "none";
                //mod_page.style["border-bottom-style"] = "none";
                //mod_page.style.padding = "0";
                document.body.appendChild(mod_page);

            }
            let mod_panel_selected = document.getElementById('mod_panel_selected');
            let mod_panel = document.getElementById('mod_panel');
            let mod_page = document.getElementById('mod_page');

            function mix(a,b,x){return a*(1.-x)+b*x;}

            if(settings_open){
                settings_pos_x = mix(settings_pos_x,68.5,mix(.052,1-(68.5-settings_pos_x)/(68.5+800),.01));
            }else{
                settings_pos_x = mix(settings_pos_x,-800,.024);
            }
            mod_panel.style.left = settings_pos_x;
            mod_page.style.left = settings_pos_x-50;

            settings_menu_x = mix(settings_menu_x,menu_options[menu_open],.04)
            mod_panel_selected.style.left = settings_menu_x*menu_width/5-3;
            let opacity = Math.min(Math.max(Math.max(1-Math.abs(settings_menu_x-4),0)*2-.5,0),1);
            mod_page.style.opacity = opacity;
            if(opacity == 0){
                mod_page.style.left = -1000;
            }

        }

        function update(){
            hold_down_keys();
            keep_settings_button();
            int_it++;
        }


        document.addEventListener("keydown", function(e) {

            if(e.key == "<" && e.ctrlKey){
                toggle_key_state("Tab","Tab",9);
                toggle_key_state("y","KeyY",89);
            }
            if(e.key == "b" && e.ctrlKey){
                deathscreenop = !deathscreenop;
            }
            //if(e.key == "a"){
            //    console.log(e);
            //}
        });

        setInterval(update, Math.round(1000/165));
    }




})();