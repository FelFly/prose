(function(config, models, views, routers, utils, templates) {

views.Post = Backbone.View.extend({

  id: 'post',

  events: {
    'click .save': '_save',
    'click .toggle.meta': '_toggleMeta',
    'click a.toggle.preview': '_togglePreview',
    'focus input': '_makeDirty',
    'focus textarea': '_makeDirty',
    'change #post_published': 'updateMetaData',
    'click .delete': '_delete',
    'click .toggle-options': '_toggleOptions'
  },

  _toggleOptions: function() {
    $('.options').toggle();
    return false;
  },

  _delete: function() {
    if (confirm("Are you sure you want to delete that document?")) {
      deletePost(app.state.user, app.state.repo, app.state.branch, this.model.path, this.model.file, _.bind(function(err) {
        router.navigate([app.state.user, app.state.repo, app.state.branch, this.model.path].join('/'), true);
      }, this));      
    }
    return false;
  },

  updateURL: function() {
    router.navigate([app.state.user, app.state.repo, app.state.branch, this.model.path, this.model.file].join('/'), false);
  },

  updateFilename: function(file, cb) {
    var that = this;
    
    if (this.model.persisted) {
      if (!_.validFilename(file)) return cb('error');
      movePost(app.state.user, app.state.repo, app.state.branch, this.model.path + "/" + this.model.file, this.model.path + "/" + file, _.bind(function(err) {
        if (!err) this.updateURL();
        err ? cb('error') : cb(null)
      }, this));
    }
    this.model.file = file;
  },

  _makeDirty: function(e) {
    this.dirty = true;
    this.$('.button.save').html('SAVE');
    this.$('.button.save').removeClass('inactive');
    // this.updateMetaData();
  },
  
  _save: function(e) {
    if (!this.dirty) return false;
    e.preventDefault();
    this.updatePost(this.model.metadata.published, 'Updated '+ this.model.file);
  },

  _togglePreview: function(e) {
    if (e) e.preventDefault();
    $('.toggle.preview').toggleClass('active');
    this.$('.post-content').html(marked(this.editor.getValue()));
    $('.document .surface').toggleClass('preview');
  },

  _toggleMeta: function(e) {
    if (e) e.preventDefault();
    $('.toggle.meta').toggleClass('active');
    $('.metadata').toggle();
    return false;
  },

  initialize: function() {
    this.mode = "edit";
    if (!window.shortcutsRegistered) {
      key('⌘+s, ctrl+s', _.bind(function() { this.updatePost(undefined, "Updated " + this.model.file); return false; }, this));
      key('ctrl+shift+p', _.bind(function() { this._togglePreview(); return false; }, this));
      key('ctrl+shift+m', _.bind(function() { this._toggleMeta(); return false; }, this));
      window.shortcutsRegistered = true;
    }
  },

  parseMetadata: function(metadata) {
    try {
      return jsyaml.load(this.rawMetadata);
    } catch(err) {
      return null;
    }
  },

  // TODO: remove comments and simplify after we are sure that we don't want to parse metadata
  updateMetaData: function() {

    // Update published
    function updatePublished(yamlStr, published) {
      var regex = /published: (false|true)/;
      if (yamlStr.match(regex)) {
        return yamlStr.replace(regex, "published: " + !!published);
      } else {
        return yamlStr + "\npublished: " + !!published;
      }
    }

    this.rawMetadata = this.metadataEditor.getValue();
    var published = this.$('#post_published').prop('checked');
    var metadata = this.parseMetadata(this.rawMetadata);

    if (metadata) {
      this.model.metadata = metadata;
      this.rawMetadata = updatePublished(this.rawMetadata, published);
      this.metadataEditor.setValue(this.rawMetadata);
      if (this.model.metadata.published) {
        $('#post').addClass('published');
      } else {
        $('#post').removeClass('published');
      }
      return true;
    } else {
      return false;
    }
  },
  

  updatePost: function(published, message) {
    var file = $('input.filename').val();
    var that = this;

    function save() {
      if (that.updateMetaData()) {
        savePost(app.state.user, app.state.repo, app.state.branch, that.model.path, that.model.file, that.rawMetadata, that.editor.getValue(), message, function(err) {
          that.dirty = false;
          that.model.persisted = true;
          that.updateURL();
          $('.button.save').html('SAVED');
          $('.button.save').addClass('inactive');
        });
      } else {
        $('.button.save').html('! Metadata');
      }
    }

    this.$('.button.save').addClass('inactive');
    this.$('.button.save').html('SAVING ...');
    this.$('.document-menu-content .options').hide();

    if (file === this.model.file) return save();    
    this.updateFilename(file, function(err) {
      err ? $('.button.save').html('! Filename') : save();
    });
  },

  keyMap: function() {
    var that = this;
    return {
      // This doesn't work. Why?
      "Shift-Ctrl-P": function(codemirror) {
        that._togglePreview();
      },
      "Shift-Ctrl-M": function(codemirror) {
        that._toggleMeta();
      },
      "Ctrl-S": function(codemirror) {
        that.updatePost(undefined, "Updated " + that.model.file);
      }
    };
  },

  initEditor: function() {
    var that = this;
    setTimeout(function() {

      that.metadataEditor = CodeMirror.fromTextArea(document.getElementById('raw_metadata'), {
        mode: 'yaml',
        theme: 'poole-dark',
        lineWrapping: true,
        extraKeys: that.keyMap(),
        onChange: _.bind(that._makeDirty, that)
      });

      $('#post .metadata').hide();

      that.editor = CodeMirror.fromTextArea(document.getElementById('code'), {
        mode: 'markdown',
        lineWrapping: true,
        extraKeys: that.keyMap(),
        matchBrackets: true,
        theme: 'poole-bright',
        onChange: _.bind(that._makeDirty, that)
      });
    }, 100);
  },

  // UpdateHeight
  updateHeight: function() {
    $('.personalities-wrapper').height(this.$('.content .CodeMirror').height());
  },

  render: function() {
    var that = this;
    $(this.el).html(templates.post(_.extend(this.model, { mode: this.mode })));
    if (this.model.metadata.published) $(this.el).addClass('published');
    this.initEditor();
    return this;
  }
});

}).apply(this, window.args);
