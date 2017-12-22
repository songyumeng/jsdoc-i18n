'use strict';

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var logger = require('jsdoc/lib/jsdoc/util/logger');
/**
 *
 * @param object
 */
function pruneUndefined(object) {
	for (var key in object) {
		if (object[key] === undefined) {
			delete object[key];
		}
	}
}

/**
 *
 * @param current
 * @param nodes
 */
function graftApi(current, nodes) {
	nodes.forEach(function (element) {
		if (element.kind === 'package') {
			var packageData = {
				kind: element.kind,
				files: element.files
			};

			current.push(packageData);
		} else {
			var data = {};
			for (var property in element) {
				if(property==='comment'){
					data.hash= crypto.createHash('md5').update(element.comment).digest("hex");
					continue;
				}
				var value = element[property];
				if (value !== undefined) {
					data[property] = value;
				}
			}


			// Reconstruct full filename
			data.meta.filename = path.join(data.meta.path, data.meta.filename);
			delete data.meta.path;

			// Delete any undefined proprties
			pruneUndefined(data);

			current.push(data);
		}
    });
}

/**
 *
 * @param current
 * @param node
 */
function graftTemplates(current, node) {
	var tutorialNames = Object.keys(node._tutorials);
	tutorialNames.forEach(function (tutorialName) {
		var tutorial = node._tutorials[tutorialName];

		var data = {
			name: tutorial.name,
			longname: tutorial.longname,
			type: tutorial.type,
			title: tutorial.title,
			content: tutorial.content,
			hash: crypto.createHash('md5').update(tutorial.content).digest("hex")
		};

		data.children = tutorial.children.map(function (child) {
			return child.longname;
		});

		current.push(data);
	});
}

/**
 *
 * @param data
 * @param opts
 * @param tutorials
 */
exports.publish = function(data, opts, tutorials) {
	var db = require('../db');

	// Remove undocumented doclets
    data({ undocumented: true }).remove();

	// Reformat api and tutorials data structure
	var dataApi = [];
	var dataTemplates = [];
	graftApi(dataApi, data().get());
	graftTemplates(dataTemplates, tutorials);

	// Write serialized data to database
	db.updateDefault(dataApi, dataTemplates);
};
