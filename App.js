Ext.define('Rally.apps.defectsbycloser.App', {
    extend: 'Rally.app.TimeboxScopedApp',
    componentCls: 'app',
    scopeType: 'release',
    comboboxConfig: {
        fieldLabel: 'Select a Release:',
        labelWidth: 100,
        width: 300
    },

    addContent: function() {
        this.add({
            xtype: 'container',
            itemId: 'grid'
        });
        this._loadDefects();
    },

    onScopeChange: function() {
        this._loadDefects();
    },

    _loadDefects: function() {
        Ext.create('Rally.data.WsapiDataStore', {
            model: 'Defect',
            autoLoad: true,
            fetch: ['FormattedID', 'Name', 'Owner', 'DisplayName', 'UserName', 'RevisionHistory'],
            filters: [this.getContext().getTimeboxScope().getQueryFilter()],
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
        this._customRecords = Ext.Array.map(data, function(defect) {
            return {
                _ref: defect.get('_ref'),
                FormattedID: defect.get('FormattedID'),
                Name: defect.get('Name'),
                ClosedBy: '-',
                DateClosed: '-',
                RevisionHistory: defect.get('RevisionHistory'),
                RevisionNumber: '-'
            };
        }, this);

        this._getRevisionHistory();
    },

    _getRevisionHistory: function() {
        this._numberTimesLoaded = 0;

        if (this._customRecords.length > 0) {
            Rally.data.ModelFactory.getModel({
                type: 'RevisionHistory',
                scope: this,
                success: function(model) {
                    this._onModelLoaded(model);
                }
            });
        } else {
            this._buildGrid();
        }
    },

    _onModelLoaded: function(model) {
        Ext.Array.each(this._customRecords, function(defect, index) {
            model.load(Rally.util.Ref.getOidFromRef(defect.RevisionHistory), {
                scope: this,
                success: function(record) {
                    this._onRevisionHistoryLoaded(defect, record);
                }
            });
        }, this);
    },

    _onRevisionHistoryLoaded: function(defect, record) {
        record.getCollection('Revisions').load({
            fetch: ['RevisionNumber', 'CreationDate', 'User', 'Description'],
            scope: this,
            callback: function(revisions) {
                this._onRevisionsLoaded(revisions, defect);
            }
        }); 
    },

    _onRevisionsLoaded: function(revisions, defect) {
        Ext.Array.each(revisions, function(revision, revisionIndex) {
            if (revision.get('Description').search("CLOSED DATE added") !== -1) {
                defect.RevisionNumber = revision.get('RevisionNumber');
                defect.DateClosed = Rally.util.DateTime.formatWithDefault(revision.get('CreationDate'), this.getContext());
                defect.ClosedBy = revision.get('User')._refObjectName;
                return false;
            } else if (revisionIndex === (revisions.length-1)) {
                Ext.Array.remove(this._customRecords, defect);
                this._numberTimesLoaded--;
            }
        }, this);

        this._numberTimesLoaded++;

        if (this._numberTimesLoaded === this._customRecords.length) {
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
                columnCfgs: [
                    {text: 'Formatted ID', dataIndex: 'FormattedID', xtype: 'templatecolumn', 
                        tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')},
                    {text: 'Name', dataIndex: 'Name', flex: 2},
                    {text: 'Date Closed', dataIndex: 'DateClosed', flex: 2},
                    {text: 'Revision Number', dataIndex: 'RevisionNumber'},
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
        var title = this.getContext().getTimeboxScope().getRecord().get('Name'),
            options = "toolbar=1,menubar=1,scrollbars=yes,scrolling=yes,resizable=yes,width=1000,height=500";

        // code to get the style that we added in the app.css file
        var css = document.getElementsByTagName('style')[0].innerHTML;

        var printWindow;

        if (Ext.isIE) {
            printWindow = window.open();
        } else {
            printWindow = window.open('', title, options);
        }

        var doc = printWindow.document;

        var grid = this.down('#grid');

        doc.write('<html><head>' + '<style>' + css + '</style><title>' + title + '</title>');
        doc.write('</head><body class="landscape">');
        doc.write('<p style="font-family:Arial,Helvetica,sans-serif;margin:5px">Release: ' + title + '</p><br />');
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