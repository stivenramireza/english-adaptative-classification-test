const service = require("../services");
const Examen = require('../models/examen');
const {validationResult} = require('express-validator/check');
const mongoose = require('mongoose');
var request = require('request')


function loadPreStarted(req, res) {
    res.render('../views/test-prestarted/test-prestarted.ejs');
}

function loadTest(req, res) {
    res.render('../views/examen/examen.ejs');
}

function loadResult(req, res) {
    res.render('../views/examen-results/examen-results.ejs');
}

function activarExamen(req, res) {
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({errors: errors.array()});
    }
    const new_examen = new Examen({
        _id: mongoose.Types.ObjectId(),
        doctype: fromNumberToDocType(req.body.doctype),
        docnumber: req.body.docnumber,
        questions: req.body.questions,
        responses: req.body.responses,
        grade: req.body.grade,
        classified_level: req.body.currenclassified_leveltcity,
        fecha: req.body.fecha,
        hora_inicio: req.body.hora_inicio,
        hora_fin: req.body.hora_fin,
        duracion_examen: req.body.duracion_examen,
        clasificador: req.body.clasificador
    });
    //save in the database
    new_examen.save((err) => {
        if (err) return res.status(500).send({
            message: `Error al activar el examen del aspirante: ${err}`
        })
        return res.status(200).send({
            message: 'Activación exitosa del examen del aspirante',
            token: service.createToken(new_candidate)
        })
    })
}

function saveTestStatus(req, res, data) {
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(422).json({
            errors: errors.array()
        });
    }
    var _data = JSON.parse(data);
    console.log(_data.question.ability);
    var today = new Date();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    const new_examen = new Examen({
        _id: mongoose.Types.ObjectId(),
        doctype: 1, //Just a simple doct
        docnumber: "1662829272", // Just a simple docn
        questions: _data.question.administered_items, // To be updated
        responses: _data.question.response_vector, // To be updated
        grade: 0.0, // To be updated
        classified_level: 0, // To be updated
        hora_inicio: time,
        hora_fin: time, // To be updated
        clasificador: "1662829272", //Just a simple docn
        last_ability: _data.question.ability,
        parts: _data.question.parts
    });
    //console.log(data);
    new_examen.save((err) => {
        if (err) {
            console.log(err);
            return res.status(500).send({
                message: `Error al activar el examen del aspirante: ${err}`
            });
        }
        return res.status(200).send({
            message: 'Activación exitosa del examen del aspirante',
            question: {
                title: _data.question.title,
                responses: _data.question.responses,
                n_item: _data.question.n_item,
                ability: _data.question.ability
            }
        });
    });
}

function next_question(req, res) {
    var doc_number = "1662829272"; //req.body.doc_number;
    var doc_type = "1"; //req.body.doc_type;
    Examen.findOne({docnumber: doc_number, doctype: doc_type}, function (err, examen) {
        if (err) {
            console.find("Cannot find the specified test.");
            return res.status(404).send({});
        } else {
            var obj = {
                doctype: examen.doctype, //Just a simple doct
                docnumber: examen.docnumber, // Just a simple docn
                questions: examen.questions, // To be updated
                responses: examen.responses, // To be updated
                grade: examen.grade, // To be updated
                classified_level: examen.classified_level, // To be updated
                hora_inicio: examen.hora_inicio,
                hora_fin: examen.hora_fin, // To be updated
                clasificador: examen.clasificador, //Just a simple docn
                last_ability: examen.last_ability,
                parts: examen.parts
            };
            //const QUERY_PATH = "http://localhost:5001";
            const QUERY_PATH = "http://ec2-34-207-193-227.compute-1.amazonaws.com";
            request.post({
                url: QUERY_PATH + '/test/next_question',
                body: {
                    n_item: req.body.n_item,
                    n_response: req.body.n_response,
                    ability: obj.last_ability,
                    administered_items: obj.questions,
                    response_vector: obj.responses,
                    parts: obj.parts
                },
                json: true
            }, function (error, response, data) {
                if(error){
                    console.log("Error ML API");
                    return res.status(500).send({});
                }
                var _data = data;
                console.log(data);
                examen.ability = _data.question.ability;
                examen.questions = _data.question.administered_items;
                examen.responses = _data.question.response_vector;
                examen.parts = _data.question.parts;
                examen.save(function(err, doc){
                   if(!err){
                       console.log("Examen updated.");
                       return res.status(200).send(_data);
                   }else{
                       console.log("Examen hasn't been saved");
                       return res.status(500).send({});
                   }
                });
            });
        }
    });
}

module.exports = {
    loadPreStarted,
    loadTest,
    loadResult,
    activarExamen,
    saveTestStatus,
    next_question
};