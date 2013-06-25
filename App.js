Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    items: [
        {
            xtype: 'container',
            itemId: 'releaseFilter'
        },
        {
            xtype: 'container',
            itemId: 'grid'
        }
    ],

    launch: function() {

        this.down('#releaseFilter').add({
            xtype: 'rallyreleasecombobox',
            itemId: 'releaseComboBox',
            fieldLabel: 'Select Release: ',
            width: 310,
            labelWidth: 100,
            listeners: {
                ready: this._onReleaseComboboxLoad,
                change: this._onComboBoxChange,
                scope: this
            }
        });
    },

    _onComboBoxChange: function(comboBox) {
        this._defectRecords = [];
        this._onReleaseComboboxLoad(comboBox);
    },

    _onReleaseComboboxLoad: function(comboBox) {
        this.releaseComboBox = this.down('#releaseComboBox'); 

        Ext.create('Rally.data.WsapiDataStore', {
            model: 'Defect',
            autoLoad: true,
            fetch: ['FormattedID', 'Name', 'Owner', 'DisplayName', 'UserName', 'RevisionHistory'],
            filters: [this.releaseComboBox.getQueryFromSelected()],
            sorters: [{
                property: 'FormattedID',
                direction: 'ASC'
            }],
            listeners: {
                load: this._onDefectDataLoaded,
                scope: this
            }
        });

        //Rally.data.ModelFactory.getModel({
        //    type: 'Defect',
        //    success: this._onModelRetrieved,
        //    scope: this
        //});
    },

    _onDefectDataLoaded: function(store, data) {
        var me = this;
        this._customRecords = [];
        if (data.length === 0) {
            //this._onDefectDataBuilt([],0);
        }
        Ext.Array.each(data, function(defect) {
            //this._defectRecords.push(defect);
            //console.log('id: ' + Rally.util.Ref.getOidFromRef(defect.get('RevisionHistory')))
            this._customRecords.push({
                FormattedID: defect.get('FormattedID'),
                Name: defect.get('Name'),
                Owner: defect.get('Owner').DisplayName,
                RevisionID: Rally.util.Ref.getOidFromRef(defect.get('RevisionHistory')),
                RevisionNumber: ''
            });
        }, this);

        this._getRevisionHistory(data)
    },

    _getRevisionHistory: function(defectList) {
        //debugger;
        //console.log('defect outside function: ' + defect.internalId);
        this._currentDefectList = Ext.clone(defectList);
        this._defectIndex = 0;
        var me = this, count;
        //debugger;
        if (defectList.length > 0) {
            Ext.Array.each(defectList, function(defect) {
                //this._currentDefect = defect;
                this._revisionModel = Rally.data.ModelFactory.getModel({
                    type: 'RevisionHistory',
                    scope: this,
                    success: function(model) {
                        //debugger;
                        //console.log('defect that revisions are taken from: ' + this._currentDefect.internalId);
                        model.load(Rally.util.Ref.getOidFromRef(this._currentDefectList[this._defectIndex].get('RevisionHistory')),{
                            scope: this,
                            success: function(record, operation) {
                                console.log('count received: ' + record.get('Revisions').Count + 
                                    ' for id: ' + record.internalId + '; index: ' + this._defectIndex + '; defect: ' + 
                                    this._currentDefectList[this._defectIndex]
                                );
                                debugger;
                                Ext.Array.each(this._customRecords, function(defect) {
                                    if (record.internalId === defect.RevisionID) {
                                        defect.RevisionNumber = record.get('Revisions').Count;
                                    }
                                })
                                //count = record.get('Revisions').Count;
                                //return record.get('Revisions').Count;
                                this._buildGrid();
                            }
                        });
                        this._defectIndex += 1;
                    }
                });
                return count;
            }, this);
        }

        //me._revisionModel.load(Rally.util.Ref.getOidFromRef(this._currentRecord.get('RevisionHistory')),{
        //    scope: this,
        //    success: function(record, operation) {
        //        debugger;
        //    }
        //});
    
    },

    _buildGrid: function() {
        this.grid
    }

    //_onModelRetrieved: function(model) {
    //    var me = this;
    //    this.grid = this.add({
    //        xtype: 'rallygrid',
    //        model: model,
    //        columnCfgs: [
    //            {text: 'Formatted ID', dataIndex: 'FormattedID', flex: 1},
    //            {text: 'Name', dataIndex: 'Name', flex: 2},
    //            {text: 'Revision Number', dataIndex: 'Summary', flex: 1,  renderer: function(value, metaData, record) {
    //                var number = 7;
    //                //var revision_history = me._getRevisionHistory(record);
    //                //debugger;
    //                me._currentRecord = Ext.clone(record);
    //                number = me._getRevisionHistory();
    //                
    //
    //                //var recordStore = record.getCollection('RevisionHistory',{
    //                //    fetch: ['Revisions'],
    //                //    autoLoad: true,
    //                //    callback: function(revisions, operation, success) {
    //                //        debugger;
    //                //        number = revisions.length;
    //                //    }
    //                //});
    //                return number;
    //            }}
    //        ],
    //        storeConfig: {
    //            listeners: {
    //                load: this._onDefectsLoaded,
    //                scope: this
    //            },
    //            fetch: [
    //                'FormattedID',
    //                'Name',
    //                'RevisionHistory',
    //                'Owner',
    //                'DisplayName',
    //                'UserName'
    //            ],
    //            context: this.context.getDataContext(),
    //            filters: [
    //                {
    //                    property: 'Release',
    //                    operator: '=',
    //                    value: this.down('#releaseComboBox').getValue()
    //                }
    //            ]
    //        },
    //        
    //        showPagingToolbar: false
    //    });
    //},

    
    //_onRevisionHistoryLoaded: function(store, data) {
    //    
    //    debugger;
    //},

    //_onDefectsLoaded: function(store, records){
    //    console.log('Empty Grid... WOot');
    //}
});