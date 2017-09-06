var gulp = require("gulp");
var babel = require("gulp-babel");

gulp.task('babel', function() {
  gulp.src('./src/**/*.js')
    .pipe(babel())
    .pipe(gulp.dest('./dist/'))
});

gulp.task('watch', function() {
  gulp.watch('./*.es6', ['babel'])
});

gulp.task('default', ['babel', 'watch']);