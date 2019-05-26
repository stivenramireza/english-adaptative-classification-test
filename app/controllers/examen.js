const Examen = require('../models/examen');
const { validationResult } = require('express-validator/check');
const mongoose = require('mongoose');

var request = require('request')

function saveTestStatus(req, res, data) {
    var errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(422).json({
            errors: errors.array()
        });
    }
    var _data = JSON.parse(data);
    let doctype = req.query.doctype;
    let docnumber = req.query.docnumber;
    let clasificador = req.query.clasificador;
    var today = new Date();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    const new_examen = new Examen({
        _id: mongoose.Types.ObjectId(),
        doctype: doctype, //Just a simple doct
        docnumber: docnumber, // Just a simple docn
        questions: _data.question.administered_items, // To be updated
        responses: _data.question.response_vector, // To be updated
        grade: 0.0,
        part1: 0.0,
        part2: 0.0,
        part3: 0.0, // To be updated
        classified_level: "0", // To be updated
        final_level: "A falta de realización de la entrevista",
        hora_inicio: time, // Static
        hora_fin: time, // To be updated
        clasificador: clasificador, //Just a simple docn
        last_ability: _data.question.ability, // To be updated
        parts: _data.question.parts // To be updated
    });
    new_examen.save((err) => {
        if (err) {
            return res.status(500).send({
                message: `Error al activar el examen del aspirante: ${err}`,
                status: 'failed'
            });
        }
        return res.status(200).send({
            message: 'Activación exitosa del examen del aspirante',
            question: {
                title: _data.question.title,
                responses: _data.question.responses,
                n_item: _data.question.n_item,
                ability: _data.question.ability,
            },
            status: 'success',
            examen: new_examen._id
        });
    });
}

function next_question(req, res) {
    var idEx = req.body._id;
    Examen.findOne({ _id: idEx }, function (err, examen) {
        if (err) {
            return res.status(404).send({
                message: 'Cannot find the specified test.',
                status: 'failed'
            });
        } else {
            var obj = {
                doctype: examen.doc_type, //Just a simple doct
                docnumber: examen.doc_number, // Just a simple docn
                questions: examen.questions, // To be updated
                responses: examen.responses, // To be updated
                grade: examen.grade,
                part1: examen.part1, // To be updated
                part2: examen.part2,
                part3: examen.part3,
                classified_level: examen.classified_level, // To be updated
                final_level: examen.final_level,
                hora_inicio: examen.hora_inicio,
                hora_fin: examen.hora_fin, // To be updated
                clasificador: examen.clasificador, //Just a simple docn
                last_ability: examen.last_ability, // To be updated
                parts: examen.parts // To be updated
            };
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
                if (error) {
                    return res.status(500).send({
                        message: 'Error ML API',
                        status: 'failed'
                    });
                }
                var _data = data;
                examen.ability = _data.question.ability;
                examen.questions = _data.question.administered_items;
                examen.responses = _data.question.response_vector;
                examen.parts = _data.question.parts;
                examen.save(function (err, doc) {
                    if (!err) {
                        return res.status(200).send(_data);
                    } else {
                        return res.status(500).send({
                            message: 'Examen hasnt been saved',
                            status: 'failed'
                        });
                    }
                });
            });
        }
    });
}

function statistics(req, res) {

    let clasificador = req.query.clasificador;
    let fecha_inicio = req.query.fecha_inicio;
    let fecha_fin = req.query.fecha_fin;
    let classified_level = req.query.classified_level;
    let final_level = req.query.final_level;

    var queryString = "{ ";

    if (clasificador != "") {
        queryString = queryString + "\"clasificador\": " + clasificador + " ,"

    }
    if (fecha_inicio != "" && fecha_fin != "") {
        queryString = queryString + "\"fecha\": { \"$gt\": \"" + fecha_inicio + "\", \"$lt\": \"" + fecha_fin + "\" }, ";
    }
    if (classified_level != "") {
        queryString = queryString + "\"classified_level\": " + classified_level + ", ";
    }
    if (final_level != "") {
        queryString = queryString + "\"final_level\": " + final_level + ", ";
    }

    queryString = queryString.substr(0, (queryString.length - 2));
    queryString = queryString + " }";

    Examen.find(JSON.parse(queryString), (err, info_examen) => {
        if (err) return res.status(500).send({ message: `Error al realizar la petición: ${err}`, status: 'failed' })
        if (!info_examen) return res.status(404).send({ message: `No hay registros`, status: 'success' })
        res.status(200).send({ info_examen, status: 'success' })
    })
}

function getLastYearExams(req, res) {
    var today = new Date();
    var d = new Date();
    d.setMonth(d.getMonth() - 12);

    queryString = "{ \"fecha\": { \"$gt\": \"" + d + "\", \"$lt\": \"" + today + "\" } }";
    Examen.find(JSON.parse(queryString), (err, info_examen) => {
        if (err) return res.status(500).send({ message: `Error al realizar la petición: ${err}`, status: 'failed' })
        if (!info_examen) return res.status(404).send({ message: `No hay registros`, status: 'success' })
        res.status(200).send({ info_examen, status: 'success' })
    })
}

function getLastMonthExams(req, res) {
    var today = new Date();
    var d = new Date();
    var newMonth = d.getMonth() - 1;
    if (newMonth < 0) {
        newMonth += 12;
        d.setYear(d.getYear() - 1);
    }
    d.setMonth(newMonth);


    queryString = "{ \"fecha\": { \"$gt\": \"" + d + "\", \"$lt\": \"" + today + "\" } }";
    Examen.find(JSON.parse(queryString), (err, info_examen) => {
        if (err) return res.status(500).send({ message: `Error al realizar la petición: ${err}`, status: 'failed' })
        if (!info_examen) return res.status(404).send({ message: `No hay registros`, status: 'success' })
        res.status(200).send({ info_examen, status: 'success' })
    })
}

function getLastWeekExams(req, res) {
    var today = new Date()
    var d = new Date();
    d.setDate(d.getDate() - 7);

    queryString = "{ \"fecha\": { \"$gt\": \"" + d + "\", \"$lt\": \"" + today + "\" } }";
    Examen.find(JSON.parse(queryString), (err, info_examen) => {
        if (err) return res.status(500).send({ message: `Error al realizar la petición: ${err}`, status: 'failed' })
        if (!info_examen) return res.status(404).send({ message: `No hay registros`, status: 'success' })
        res.status(200).send({ info_examen, status: 'success' })
    })
}

function getLastSemesterExams(req, res) {
    var today = new Date()
    var d = new Date();
    d.setMonth(d.getMonth() - 6);

    queryString = "{ \"fecha\": { \"$gt\": \"" + d + "\", \"$lt\": \"" + today + "\" } }";
    Examen.find(JSON.parse(queryString), (err, info_examen) => {
        if (err) return res.status(500).send({ message: `Error al realizar la petición: ${err}`, status: 'failed' })
        if (!info_examen) return res.status(404).send({ message: `No hay registros`, status: 'success' })
        res.status(200).send({ info_examen, status: 'success' })
    })
}

function getAllExams(req, res) {
    Examen.find({}, (err, info_examen) => {
        if (err) return res.status(500).send({ message: `Error al realizar la petición: ${err}`, status: 'failed' })
        if (!info_examen) return res.status(404).send({ message: `No hay registros`, status: 'success' })
        res.status(200).send({ info_examen, status: 'success' })
    })
}


function getInfoExamen(req, res) {
    let docnumber = req.query.docnumber;
    Examen.findOne({ docnumber: docnumber }, {}, { sort: { '_id': -1 } }, (err, info_examen) => {
        if (err) return res.status(500).send({ message: `Error al realizar la petición: ${err}`, status: 'failed' })
        if (!info_examen) return res.status(404).send({
            message: `El aspirante no tiene registrado exámenes de clasificación`,
            status: 'failed'
        })
        res.status(200).send({ info_examen, status: 'success' })
    })
}

function getInfoById(req, res) {
    let idEx = req.query._id;
    Examen.findOne({ _id: idEx }, (err, info_examen) => {
        if (err) return res.status(500).send({ message: `Error al realizar la petición: ${err}`, status: 'failed' })
        if (!info_examen) return res.status(404).send({
            message: `El aspirante no tiene registrado exámenes de clasificación`,
            status: 'failed'
        })
        res.status(200).send({ info_examen, status: 'success' })
    })
}

function updateInfoExamen(req, res) {
    let idExamen = req.query.idExamen;
    let update = req.body
    Examen.update({ _id: idExamen }, update, (err, examUpdated) => {
        if (err) return res.status(500).send({ message: `Error al actualizar examen: ${err}`, status: 'failed' })
        res.status(200).send({ new_examen: examUpdated, status: 'success' })
    })
}

function updateByDocNumber(req, res) {
    let docnumber = req.query.docnumber;
    let update = req.body
    Examen.updateOne({ docnumber: docnumber }, update, (err, examUpdated) => {
        if (err) return res.status(500).send({ message: `Error al actualizar examen: ${err}`, status: 'failed' })
        res.status(200).send({ new_examen: examUpdated, status: 'success' })
    })
}

module.exports = {
    saveTestStatus,
    next_question,
    getInfoExamen,
    getInfoById,
    updateInfoExamen,
    updateByDocNumber,
    statistics,
    getLastYearExams,
    getLastMonthExams,
    getLastWeekExams,
    getLastSemesterExams,
    getAllExams
};