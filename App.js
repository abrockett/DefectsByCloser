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
                    success: this._onModelCreated
                });
                return count;
            }, this);
        } else {
            this._buildGrid();
        }
    },

    _onModelCreated: function(model) {
        model.load(Rally.util.Ref.getOidFromRef(this._currentDefectList[this._defectIndex].get('RevisionHistory')),{
            scope: this,
            success: this._onModelLoaded
        });
        this._defectIndex += 1;
    },

    _onModelLoaded: function(record, operation) {
        record.getCollection('Revisions').load({
            fetch: true,
            scope: this,
            callback: function(revisions, operation, success) {
                this._onRevisionsLoaded(revisions, record);
            }
        }); 
    },

    _onRevisionsLoaded: function(revisions, record) {
        Ext.Array.each(revisions, function(revision, revisionIndex) {
            if (revision.data.Description.search("CLOSED DATE added") !== -1) {
                Ext.Array.each(this._customRecords, function(customDefect) {
                    if (customDefect.RevisionID === record.internalId) {
                        customDefect.RevisionNumber = revision.get('RevisionNumber');
                        customDefect.DateClosed = revision.get('CreationDate');
                        customDefect.ClosedBy = revision.get('User')._refObjectName;
                        return false;
                    }
                }, this);
                return false;
            } else if (revisionIndex === (revisions.length-1)) {
                Ext.Array.each(this._customRecords, function(customDefect) {
                    if (customDefect && (customDefect.RevisionID === record.internalId)) {
                        Ext.Array.remove(this._customRecords, customDefect);
                    }
                }, this);
            }
        }, this);
        this._buildGrid();
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
    },

    getOptions: function() {
        return [
            {
                text: 'Print',
                handler: this._onButtonPressed,
                scope: this
            }
        ];
    },

    _onButtonPressed: function() {
        var title = this.down('#releaseComboBox').getRawValue(),
            options = "toolbar=1,menubar=1,scrollbars=yes,scrolling=yes,resizable=yes,width=1000,height=500";

        // code to get the style that we added in the app.css file
        var css = document.getElementsByTagName('style')[0].innerHTML;

        var printWindow = window.open('', '', options);

        var doc = printWindow.document;

        var grid = this.down('#grid');

        doc.write('<html><head>' + '<style>' + css + '</style><title>' + title + '</title>');
        doc.write('</head><body class="landscape">');
        doc.write('<p>Release: ' + title + '</p><br />');
        doc.write(grid.getEl().dom.innerHTML);
        doc.write('</body></html>');
        doc.close();

        this._injectCSS(printWindow);

        printWindow.print();

    },

    _injectContent: function(html, elementType, attributes, container, printWindow){
        elementType = elementType || 'div';
        container = container || printWindow.document.getElementsByTagName('body')[0];

        var element = printWindow.document.createElement(elementType);

        Ext.Object.each(attributes, function(key, value){
            if (key === 'class') {
                element.className = value;
            } else {
                element.setAttribute(key, value);
            }
        });

        if(html){
            element.innerHTML = html;
        }

        return container.appendChild(element);
    },

    _injectCSS: function(printWindow){
        //find all the stylesheets on the current page and inject them into the new page
        Ext.each(Ext.query('link'), function(stylesheet){
                this._injectContent('', 'link', {
                rel: 'stylesheet',
                href: stylesheet.href,
                type: 'text/css'
            }, printWindow.document.getElementsByTagName('head')[0], printWindow);
        }, this);
    }
});