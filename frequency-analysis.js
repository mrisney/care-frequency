$(function () {

    const AGENCY = "wy"
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
            return $.getJSON(REST_SVC_BASE_URL + '/api/v1/' + AGENCY + '/datasources');
        }
    });

    // filters lookup
    var filtersDS = new DevExpress.data.CustomStore({
        key: "value",
        loadMode: "raw",
        cacheRawData: true,
        byKey: function (key) {
            var d = new $.Deferred();
            $.get(REST_SVC_BASE_URL + '/api/v1/' + AGENCY + '/filters?datasource=' + key)
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
            $.get(REST_SVC_BASE_URL + '/api/v1/' + AGENCY + '/variables?datasource=' + key)
                .done(function (dataItem) {
                    d.resolve(dataItem);
                });
            return d.promise();
        }
    });

    function getFrequencyAnalysisData() {
        $.ajax({
            url: REST_SVC_BASE_URL + '/api/v1/' + AGENCY + '/frequency-analysis',
            type: "POST",
            data: JSON.stringify(frequencyAnalysisRequest),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (data) {
                console.log(JSON.stringify(data));
                frequencyAnalysisData = data;

                $("#freq-grid-container").dxDataGrid("instance").option("dataSource", data);
                $("#freq-grid-container").dxDataGrid("instance").refresh();
                $("#freq-chart").dxPieChart("instance").option("dataSource", data);
                $("#freq-chart").dxPieChart("instance").refresh();
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
        });

        var variableEditor = $("#freq-form-container").dxForm("instance").getEditor("variable");

        variablesDS.byKey(datasourceSelected).done(function (values) {
            var variables = [];
            values.forEach((element) => {
                variables.push({ value: element.value });
            });
            variableEditor.option("dataSource", variables);
        });

        $("#freq-grid-container").dxDataGrid("instance").refresh();
    }

    var form = $("#freq-form-container").dxForm({
        formData: {
            datasource: null,
            filter: "",
            variable: "",
            noNulls: false
        },
        colCount: 5,
        labelLocation: "top",
        items: [{
            dataField: "datasource",
            editorType: "dxSelectBox",
            editorOptions: {
                dataSource: dataSourcesDS,
                searchEnabled: true,
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
            colSpan: 2,
            editorOptions: {
                searchEnabled: true,
                displayExpr: "value",
                valueExpr: "value",
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
            dataField: "variable",
            editorType: "dxSelectBox",
            editorOptions: {
                searchEnabled: true,
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
        selection: {
            mode: 'multiple'
        },
        export: {
            enabled: true
        },
        onExporting: function (e) {
            var workbook = new ExcelJS.Workbook();
            var worksheet = workbook.addWorksheet('Frequency Analysis');
            DevExpress.excelExporter.exportDataGrid({
                worksheet: worksheet,
                component: e.component,
                customizeCell: function (options) {
                    var excelCell = options;
                    excelCell.font = { name: 'Arial', size: 12 };
                    excelCell.alignment = { horizontal: 'left' };
                }
            }).then(function () {
                workbook.xlsx.writeBuffer().then(function (buffer) {
                    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'frequency-analysis.xlsx');
                });
            });
            e.cancel = true;
        },
        dataSource: initData,
        keyExpr: "id",
        showBorders: true,
        onCellClick: function (e) {
            if (e.rowType == 'header') {
                updateChart(e.column.dataField);

            }
        },
        columns: [
            { dataField: "variableCodes", caption: frequencyAnalysisRequest.variableName, allowExporting: true },
            { dataField: "frequency1", caption: "Frequency", allowExporting: true },
            { dataField: "cumulativeFrequency1", caption: "Cum. Frequency" },
            {
                dataField: "percent1", caption: "Percent", format: "fixedPoint",
                precision: 2, dataType: "number",
                customizeText: function (cellInfo) {
                    return cellInfo.valueText + " %";
                }
            },
            {
                dataField: "cumulativePercent1", caption: "Cum. Percent", format: "fixedPoint",
                precision: 2, dataType: "number",
                customizeText: function (cellInfo) {
                    return cellInfo.valueText + " %";
                }
            }],
        summary: {
            totalItems: [{
                column: "cumulativePercent1",
                summaryType: "count"
            }]
        }
    });
    var piechart = $("#freq-chart").dxPieChart({
        type: 'doughnut',
        palette: "bright",
        dataSource: initData,
        legend: {
            horizontalAlignment: "center",
            verticalAlignment: "bottom"
        },
        series: [
            {
                argumentField: "variableCodes",
                valueField: "percent1",
                label: {
                    visible: true,
                    connector: {
                        visible: true,
                        width: 1
                    }
                }
            }
        ],
        title: {
            text: "Percent",
            font: {
                size: 14,
                weight: 300
            },
        },
        export: {
            enabled: true
        },
        onPointClick: function (e) {
            var point = e.target;

            toggleVisibility(point);
        },
        onLegendClick: function (e) {
            var arg = e.target;

            toggleVisibility(this.getAllSeries()[0].getPointsByArg(arg)[0]);
        }
    });
    function toggleVisibility(item) {
        if (item.isVisible()) {
            item.hide();
        } else {
            item.show();
        }
    }


    function updateChart(header) {
        var pieChart = $("#freq-chart").dxPieChart('instance');
        var pieChartData = frequencyAnalysisData.length > 0 ? frequencyAnalysisData : initData;
        var caption = header;
        switch (header) {
            case 'frequency1':
                caption = "Frequency";
                break;
            case 'cumulativeFrequency1':
                caption = "Cumulative Frequency";
                break;
            case 'percent1':
                caption = "Percent";
                break;
            case 'cumulativePercent1':
                caption = "Cumulative Percent";
                break;
        }
        pieChart.showLoadingIndicator();
        pieChart.option("title", { text: caption });

        $("#freq-chart").dxPieChart({
            dataSource: pieChartData,
            series: {
                argumentField: 'variableCodes',
                valueField: header,
                label: {
                    visible: true,
                    connector: {
                        visible: true,
                        width: 1
                    }
                }
            }
        });
        pieChart.refresh();
    }
});
