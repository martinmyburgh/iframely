var iframely = require('../../lib/iframely');
var utils = require('../../utils');
var async = require('async');
var _ = require('underscore');

module.exports = function(app) {

    app.get('/oembed2', function(req, res, next) {

        console.log('-- Loading oembed2 for', req.query.uri);

        async.waterfall([

            function(cb) {
                iframely.getRawLinks(req.query.uri, {
                    debug: req.query.debug,
                    mixAllWithDomainPlugin: req.query.mixAllWithDomainPlugin === "true",
                    disableCache: req.query.disableCache === "true"
                }, cb);
            }

        ], function(error, result) {

            if (error) {
                if (error.code == 'ENOTFOUND') {
                    return next(new utils.NotFound('Page not found'));
                }
                return next(new Error(error));
            }

            if (!req.query.debug) {
                delete result.debug;
                delete result.plugins;
                delete result.time;
            }

            if (req.query.group) {
                var links = result.links;
                var groups = {};
                CONFIG.REL_GROUPS.forEach(function(rel) {
                    var l = links.filter(function(link) { return link.rel.indexOf(rel) > -1; });
                    if (l.length > 0) {
                        groups[rel] = l;
                    }
                });

                var other = links.filter(function(link) {
                    return _.intersection(link.rel, CONFIG.REL_GROUPS).length == 0
                });
                if (other.length) {
                    groups.other = other;
                }
                result.links = groups;
            }

            res.send(result);
        });
    });

    app.get('/meta-mappings', function(req, res, next) {

        var ms = iframely.metaMappings;

        res.send({
            attributes: _.keys(ms),
            sources: ms
        });
    });

    app.get('/reader.js', function(req, res, next) {

        console.log('-- Loading reader for', req.query.uri);

        async.waterfall([

            function(cb) {
                iframely.getRawReaderLink(req.query.uri, {
                    disableCache: req.query.disableCache === "true"
                }, cb);
            }

        ], function(error, link) {

            if (error) {
                if (error.code == 'ENOTFOUND') {
                    return next(new utils.NotFound('Page not found'));
                }
                return next(new Error(error));
            }

            if (!link) {
                return next(new utils.NotFound());
            }

            var htmlArray = (link.html || "").match(/.{1,8191}/g) || "";

            var context = {
                embedCode: JSON.stringify(htmlArray),
                widgetId: JSON.stringify(1),
                uri: JSON.stringify(req.query.uri)
            };

            res.setHeader("Content-Type", "text/javascript; charset=utf-8");
            res.render("article-insertable.js.ejs", context);
        });

    });
};