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
    },

    _onDefectDataLoaded: function(store, data) {
        this._customRecords = [];
        Ext.Array.each(data, function(defect, index) {
            this._customRecords.push({
                _ref: defect.get('_ref'),
                FormattedID: defect.get('FormattedID'),
                Name: defect.get('Name'),
                ClosedBy: 'not loaded',
                DateClosed: 'not loaded',
                RevisionID: Rally.util.Ref.getOidFromRef(defect.get('RevisionHistory')),
                RevisionNumber: 'not loaded'
            });
        }, this);

        this._getRevisionHistory(data);
    },

    _getRevisionHistory: function(defectList) {
        this._currentDefectList = Ext.clone(defectList);
        this._defectIndex = 0;
        var me = this, count;
        if (defectList.length > 0) {
            Ext.Array.each(defectList, function(defect) {
                this._revisionModel = Rally.data.ModelFactory.getModel({
                    type: 'RevisionHistory',
                    scope: this,
                    success: function(model) {
                        model.load(Rally.util.Ref.getOidFromRef(this._currentDefectList[this._defectIndex].get('RevisionHistory')),{
                            scope: this,
                            success: function(record, operation) {
                                record.getCollection('Revisions').load({
                                    fetch: true,
                                    scope: this,
                                    callback: function(revisions, operation, success) {
                                        //debugger;
                                        Ext.Array.each(revisions, function(revision, revisionIndex) {
                                            //debugger;
                                            if (revision.data.Description.search("CLOSED DATE added") !== -1) {
                                                console.log('revision hit');
                                                Ext.Array.each(this._customRecords, function(customDefect) {
                                                    //debugger;
                                                    if (customDefect.RevisionID === record.internalId) {
                                                        customDefect.RevisionNumber = revision.get('RevisionNumber');
                                                        customDefect.DateClosed = revision.get('CreationDate');
                                                        customDefect.ClosedBy = revision.get('User')._refObjectName;
                                                        //debugger;
                                                        //console.log('data loaded: ', defect, record);
                                                        return false;

                                                    }
                                                }, this);
                                                return false;
                                            } else {
                                                if (revisionIndex === (revisions.length-1) ) {
                                                    Ext.Array.each(this._customRecords, function(customDefect) {
                                                        console.log('revision hit');
                                                        //debugger;
                                                        if (customDefect.RevisionID === record.internalId) {
                                                            customDefect.RevisionNumber = revision.get('RevisionNumber');
                                                            customDefect.DateClosed = revision.get('CreationDate');
                                                            customDefect.ClosedBy = revision.get('User')._refObjectName;
                                                            //debugger;
                                                            //console.log('data loaded: ', defect, record);
                                                            return false;

                                                        }
                                                    }, this);
                                                }
                                            }
                                            //console.log('building grid!');
                                            this._buildGrid();
                                        }, this);
                                    }
                                }); 
                            }
                        });
                        this._defectIndex += 1;
                    }
                });
                return count;
            }, this);
        } else {
            this._buildGrid();
        }
    },

    _buildGrid: function() {
        var customStore = Ext.create('Rally.data.custom.Store', {
            data: this._customRecords,
            pageSize: this._customRecords.length
        });

        if (!this.grid) {
            this.grid = this.down('#grid').add({
                xtype: 'rallygrid',
                store: customStore,
                sortableColumns: false,
                showPagingToolbar: false,
                columnCfgs: [
                    {text: 'Formatted ID', dataIndex: 'FormattedID', flex: 1, xtype: 'templatecolumn', 
                        tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')},
                    {text: 'Name', dataIndex: 'Name', flex: 2},
                    {text: 'Date Closed', dataIndex: 'DateClosed', flex: 2},
                    {text: 'Revision Number', dataIndex: 'RevisionNumber', flex: 1},
                    {text: 'Closed By', dataIndex: 'ClosedBy', flex: 1}
                ]
            });
        } else {
            this.grid.reconfigure(customStore);
        }
    }
});