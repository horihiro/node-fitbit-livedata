import gulp from 'gulp';
import babel from 'gulp-babel';
import eslint from 'gulp-eslint';
import plumber from 'gulp-plumber';

gulp.task('lint', () => {
  return gulp.src(['src/**/*.js'])
    .pipe(plumber())
    .pipe(eslint({ useEslintrc: true }))
    .pipe(eslint.format())
    .pipe(eslint.failOnError())
    .pipe(plumber.stop());
});

gulp.task('babel', ['lint'], () => {
  gulp.src('./src/**/*.js')
    .pipe(babel())
    .pipe(gulp.dest('./dist/'))
});

gulp.task('watch', () =>{
  gulp.watch('./src/**/*.js', ['babel'])
});

gulp.task('default', ['babel', 'watch']);