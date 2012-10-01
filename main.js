/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, window, Mustache */

define(function (require, exports, module) {
    'use strict';

    var
        featureHtml     = require("text!templates/feature.html"),
        catlistHtml     = require("text!templates/catlist.html"),
        mainHtml        = require("text!templates/display.html");

    var Commands                = brackets.getModule("command/Commands"),
        CommandManager          = brackets.getModule("command/CommandManager"),
        EditorManager           = brackets.getModule("editor/EditorManager"),
        DocumentManager         = brackets.getModule("document/DocumentManager"),
        NativeFileSystem        = brackets.getModule("file/NativeFileSystem").NativeFileSystem,
        FileUtils               = brackets.getModule("file/FileUtils"),
        ExtensionUtils          = brackets.getModule("utils/ExtensionUtils"),
        Menus                   = brackets.getModule("command/Menus");
    
    //commands
    var VIEW_HIDE_CANIUSE = "caniuse.run";
    var categories = [];
    var loaded = false;
    var featureList = {};

    function displayFeature(e) {
        var thisFeatureId = $(this).data("featureid");
        var feature = featureList[thisFeatureId];
        console.log(feature);
        //Bit of manipulation for things Mustache can't do - but most likely my fault
        feature.totalUsage = feature.usage_perc_y + feature.usage_perc_a;
        var s = Mustache.render(featureHtml,feature);
        $("#caniuse_supportdisplay").html(s);
    }

    function handleFilter(e) {
        var f = $(this).val().toLowerCase();
        console.log(f);
        $(".feature").each(function(index,elm) {
            var text = $(this).text().toLowerCase();
            if(text.indexOf(f) === -1) { $(this).hide();  }
            else { $(this).show(); }
        });
    }

    function renderData(rawdata) {
        var catLookup = {};

        for (var key in rawdata.cats) {
            categories.push({name: key, features: [], subcategories: rawdata.cats[key]});
            for (var i = 0, len = rawdata.cats[key].length; i < len; i++) {
                catLookup[rawdata.cats[key][i]] = key;
            }
        }

        for (key in rawdata.data) {
            var feature = rawdata.data[key];
            featureList[key] = feature;
            //each feature can have multiple categories, but they appear to always be within one core cat
            var cat = catLookup[feature.categories[0]];
            for (var i = 0, len = categories.length; i < len; i++) {
                if (categories[i].name === cat) {
                    //add an in ID field
                    feature.id = key;
                    categories[i].features.push(feature);
                    break;
                }
            }
        }

        console.dir(categories);
        var s = Mustache.render(catlistHtml,{"categories":categories});

        $("#caniuse_catlist").html(s);
        $("#caniuse_supportdisplay").html("");

        $("#caniuse_filter").on("keyup", handleFilter);

        $(".caniuse_feature").on("click", displayFeature);

    }

    function _handleShowCanIUse() {
        var $caniuse = $("#caniuse");
        
        if ($caniuse.css("display") === "none") {
            $caniuse.show();
            CommandManager.get(VIEW_HIDE_CANIUSE).setChecked(true);

            //get data if we don't have it yet
            if (!loaded) {
                console.log("First view, get data and display");
                $("#caniuse_supportdisplay").html("Getting stuff - stand by and be patient.");
                var moduleDir = FileUtils.getNativeModuleDirectoryPath(module);
                var dataFile = new NativeFileSystem.FileEntry(moduleDir + '/data.json');
                FileUtils.readAsText(dataFile)
                    .done(function (text, readTimestamp) {
                        renderData(JSON.parse(text));
                    })
                    .fail(function (error) {
                        FileUtils.showFileOpenError(error.code, dataFile);
                    });

            } else {
                console.log("In theory, do nothing.");
            }
        } else {
            $caniuse.hide();
            CommandManager.get(VIEW_HIDE_CANIUSE).setChecked(false);
        }
        EditorManager.resizeEditor();
    }
    
    CommandManager.register("Show CanIUse", VIEW_HIDE_CANIUSE, _handleShowCanIUse);

    function init() {
        
        ExtensionUtils.loadStyleSheet(module, "caniuse-brackets.css");

        //add the HTML UI
        var s = Mustache.render(mainHtml);
        $(".content").append(s);

        $('#caniuse').hide();
        
        var menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
        menu.addMenuItem(VIEW_HIDE_CANIUSE, "", Menus.AFTER, "menu-view-sidebar");

        $('#caniuse .close').click(function () {
            CommandManager.execute(VIEW_HIDE_CANIUSE);
        });

    }
    
    init();
    
});