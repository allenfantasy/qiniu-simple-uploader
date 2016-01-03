/**
 * @use jquery
 */
function QiniuUploader(options) {
  options = options || {};
  options = $.extend({}, QiniuUploader.defaults, options);

  // Validation
  if (!options.domain) throw new Error('Missing domain!');

  if (options.presetElem) {
    this.$fileInputElem = $('#'+options.fileInputId);
    this.$uploadElem = $('#'+options.uploadId);
    if (this.$fileInputElem.length === 0) throw new Error('Invalid fileInputId!');
    if (this.$uploadElem.length === 0) throw new Error('Invalid uploadId!');

    this.attachEvents()
  }

  this._options = options;
  this._handlers = {};

  this._init();
}

QiniuUploader.defaults = {
  tokenUrl: '/uptoken',
  uploadUrl: 'http://upload.qiniu.com/',
  presetElem: true
  // fileInputId
  // uploadId
  // domain 
};

QiniuUploader.prototype._init = function() {};

QiniuUploader.prototype.on = function(type, handler) {
  if (!this._handlers[type]) this._handlers[type] = [];
  this._handlers[type].push(handler);
};

QiniuUploader.prototype.emit = function(type) {
  if (!this._handlers[type]) return;

  var _this = this;
  var args = Array.prototype.slice.call(arguments, 1);
  this._handlers[type].forEach(function(f) {
    f.apply(_this, args);
  });
};

QiniuUploader.prototype.attachEvents = function() {
  var _this = this;
  this.$uploadElem.on('click', function() {
    $.ajax({
      type: 'GET',
      url: '/uptoken',
      contentType: 'json',
      success: function(data) {
        if (!data.uptoken) {
          _this.emit('error', {
            data: data,
            msg: 'ERROR: cannot get uptoken'
          });
          return;
        }
        _this.emit('getToken', data.uptoken);

        _this.upload(data.uptoken);
      }
    }) 
  });
};

QiniuUploader.prototype.upload = function(file, token) {
  var _this = this;
  var formData = new FormData();

  if (token === undefined) {
    if (!this._options.presetElem) throw new Error("You are using non-preset mode. Missing token");
    token = file;
    file = this.$fileInputElem[0].files[0];
  }

  formData.append('token', token);
  formData.append('file', file);

  // TODO: customize the key?
  formData.append('key', file.name); // Default name

  this.emit('started');
  $.ajax({
    xhr: function() {
      var xhr = new window.XMLHttpRequest();

      xhr.upload.addEventListener('progress', function(e) {
        if (e.lengthComputable) {
          var percent = e.loaded / e.total;
          percent = parseInt(percent * 100); 
          _this.emit('progress', percent);
        }
      }, false);
      return xhr;
    },
    type: 'POST',
    url: this._options.uploadUrl,
    data: formData,
    processData: false,
    contentType: false,
    success: function(data) {
      _this.emit('complete', _this._options.domain + data.key);
    }
  });
};
