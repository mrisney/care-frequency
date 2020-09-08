$(function () {

    const REST_SVC_BASE_URL = "http://dev.itis-app.com/care-rest";

    var frequencyAnalysisRequest = {
        dataSourceName: null,
        filterName: "",
        variableName: "",
        suppressNulls: true,
        noZeros: true
    };

    var frequencyAnalysisData = [];

    // datasources lookup
    var dataSourcesDS = new DevExpress.data.CustomStore({
        key: "value",
        loadMode: "raw",
        cacheRawData: true,
        load: function () {
            return $.getJSON(REST_SVC_BASE_URL + '/api/v1/datasources');
        }
    });

    // filters lookup
    var filtersDS = new DevExpress.data.CustomStore({
        key: "value",
        loadMode: "raw",
        cacheRawData: true,
        byKey: function (key) {
            var d = new $.Deferred();
            $.get(REST_SVC_BASE_URL + '/api/v1/filters?datasource=' + key)
                .done(function (dataItem) {
                    d.resolve(dataItem);
                });
            return d.promise();
        }
    });

    // variables lookup
    var variablesDS = new DevExpress.data.CustomStore({
        key: "value",
        loadMode: "raw",
        cacheRawData: true,
        byKey: function (key) {
            var d = new $.Deferred();
            $.get(REST_SVC_BASE_URL + '/api/v1/variables?datasource=' + key)
                .done(function (dataItem) {
                    d.resolve(dataItem);
                });
            return d.promise();
        }
    });

    function getFrequencyAnalysisData() {
        console.log("Frequency analysis request =  " + JSON.stringify(frequencyAnalysisRequest));

        $.ajax({
            url: REST_SVC_BASE_URL + '/api/v1/frequency-analysis',
            type: "POST",
            data: JSON.stringify(frequencyAnalysisRequest),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (data) {
                console.log(JSON.stringify(data));
                frequencyAnalysisData = data;

                $("#freq-grid-container").dxDataGrid("instance").option("dataSource", data);
                $("#freq-grid-container").dxDataGrid("instance").refresh();
                $("#freq-chart").dxChart("instance").option("dataSource", data);
                $("#freq-chart").dxChart("instance").refresh();

            }
        });
    }
    function refreshForm(datasourceSelected) {
        const filterEditor = $("#freq-form-container").dxForm("instance").getEditor("filter");

        filtersDS.byKey(datasourceSelected).done(function (values) {
            var filters = [];
            values.forEach((element) => {
                filters.push({ value: element.value });
            });
            filterEditor.option("dataSource", filters);
            console.log("number of items : " + filters.length);
        });

        var firstVariableEditor = $("#freq-form-container").dxForm("instance").getEditor("variable1");

        variablesDS.byKey(datasourceSelected).done(function (values) {
            var variables = [];
            values.forEach((element) => {
                variables.push({ value: element.value });
            });
            firstVariableEditor.option("dataSource", variables);
            console.log("number of items : " + variables.length);
        });

        $("#freq-grid-container").dxDataGrid("instance").refresh();
    }

    var form = $("#freq-form-container").dxForm({
        formData: {
            datasource: null,
            filter: "",
            variable1: "",
            noNulls: false
        },
        colCount: 4,
        labelLocation: "top", // or "left" | "right"
        items: [{
            dataField: "datasource",
            editorType: "dxSelectBox",
            editorOptions: {
                dataSource: dataSourcesDS,
                valueExpr: "value",
                displayExpr: "value",
                searchEnabled: false,
                value: "",
                onValueChanged: function (data) {
                    frequencyAnalysisRequest.dataSourceName = data.value;
                    refreshForm(data.value);
                }
            },
            validationRules: [{
                type: "required",
                message: "Datasource  is required"
            }]
        }, {
            dataField: "filter",
            editorType: "dxSelectBox",
            editorOptions: {
                displayExpr: "value",
                valueExpr: "value",
                template: function (data, itemElement) {
                    $("<div class='button-indicator'></div><span class='dx-button-text'>" + data.text + "</span>").appendTo(container);
                    buttonIndicator = itemElement.find(".button-indicator").dxLoadIndicator({
                        visible: false
                    }).dxLoadIndicator("instance");
                },
                onValueChanged: function (data) {
                    frequencyAnalysisRequest.filterName = data.value;
                    getFrequencyAnalysisData();
                }
            },
            validationRules: [{
                type: "required",
                message: "Filter is required"
            }]
        },
        {
            dataField: "variable1",
            editorType: "dxSelectBox",
            editorOptions: {
                displayExpr: "value",
                valueExpr: "value",
                label: { 
                    text: "Variable"
                },
                onValueChanged: function (data) {
                    $("#freq-grid-container").dxDataGrid("instance").columnOption("variableCodes", "caption", data.value.split(':')[1]);
                    frequencyAnalysisRequest.variableName = data.value;
                    getFrequencyAnalysisData();
                }
            }
        },
        {
            dataField: "noNulls",
            editorOptions: {
                onValueChanged: function (data) {
                    frequencyAnalysisRequest.suppressNulls = data.value;
                    getFrequencyAnalysisData();
                }
            }
        }
        ]
    });

    var dataGrid = $("#freq-grid-container").dxDataGrid({
        dataSource: initData,
        keyExpr: "id",
        showBorders: true,
        columns: [{ dataField: "variableCodes", caption: frequencyAnalysisRequest.variableName },
        { dataField: "frequency1", caption: "Frequency" },
        { dataField: "cumulativeFrequency1", caption: "Cum. Frequency" },
        { dataField: "percent1", caption: "Percent" },
        { dataField: "cumulativePercent1", caption: "Cum. Percent" }],
        summary: {
            totalItems: [{
                column: "cumulativePercent1",
                summaryType: "count"
            }]
        }
    });
    var chart = $("#freq-chart").dxChart({
        dataSource: initData,
        palette: "soft",
        commonSeriesSettings: {
            type: "bar",
            valueField: "frequency1",
            argumentField: "variableCodes",
            ignoreEmptyPoints: true
        },
        seriesTemplate: {
            nameField: "frequency1"
        }
    });
});