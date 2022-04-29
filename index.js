import Upload from './core/upload'

Upload.prototype.apply = function(compiler) {
  compiler.hooks.done.tapAsync('Upload', (compilation,callback) => {
    callback()
    /**
     * 根据option传入值觉得是否执行进程
     */
    if(this.options.upload) {
      this.handleOpts();
		  this.runing();
    }
  })
}