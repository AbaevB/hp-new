import gulp from 'gulp';
import plumber from 'gulp-plumber';
import sourcemaps from 'gulp-sourcemaps';
import * as dartSass from 'sass';
import gulpSass from 'gulp-sass';
const sass = gulpSass(dartSass);
import autoprefixer from 'gulp-autoprefixer';
import cleanCSS from 'gulp-clean-css';
import rename from 'gulp-rename';
import browsersync from 'browser-sync';
import babel from 'gulp-babel';
import uglify from 'gulp-uglify';
import concat from 'gulp-concat';
import imagemin, { mozjpeg } from 'gulp-imagemin';
import svgSprite from 'gulp-svg-sprite';
import { deleteAsync as del } from 'del';
import fileInclude from 'gulp-file-include';
import multiDest from 'gulp-multi-dest';
import changed from 'gulp-changed';
import webpConv from 'gulp-webp';
import gulpIf from 'gulp-if';
import ttf2woff from 'gulp-ttf2woff';
import ttf2woff2 from 'gulp-ttf2woff2';
import chalk from 'chalk';
import fs from 'fs';

const path = {
	build: {
		js: './build/js/',
		css: './build/css/',
		html: './build/',
		img: './build/img/',
		webp: './build/img/',
		svg: './build/img',
		fonts: './build/fonts/',
		libs: './build/libs/',
	},
	src: {
		js: './src/js/main.js',
		css: './src/scss/**/*.scss',
		html: './src/*.html',
		img: './src/img/**/*.{jpg,jpeg,png,gif,webp}',
		webp: './src/img/**/*.{jpg,jpeg,png,gif}',
		svg: './src/svg/*.svg',
		fonts: './src/fonts/*.{ttf,otf}',
		libs: './src/libs/**/*.*',
	},
	watch: {
		js: './src/js/**/*.js',
		css: './src/scss/**/*.scss',
		html: './src/**/*.html',
		img: './src/img/**/*.*',
		svg: './src/svg/*.svg',
		fonts: './src/fonts/*.*',
		libs: './src/libs/**/*.*',
	}
}

function js() {
	return gulp
		.src(path.src.js) 
		.pipe(plumber())
		.pipe(sourcemaps.init())
		.pipe(babel({
			presets: ['@babel/env']
		}))
		.pipe(concat('main.js')) 
		.pipe(sourcemaps.write())
		.pipe(gulp.dest(path.build.js)) 
		.pipe(browsersync.stream()); 
}

function minifyJs(){
	return gulp
		.src(`${path.build.js}main.js`)
		.pipe(uglify())
		.pipe(rename({ suffix: '.min' }))
		.pipe(gulp.dest(path.build.js))
}

function style() {
	return gulp
		.src(path.src.css) 
		.pipe(plumber())
		.pipe(sourcemaps.init())
		.pipe(sass().on('error', sass.logError)) 
		.pipe(autoprefixer({
			overrideBrowserslist: ['last 8 versions'],
      browsers: [
        'Android >= 4',
        'Chrome >= 20',
        'Firefox >= 24',
        'Explorer >= 11',
        'iOS >= 6',
        'Opera >= 12',
        'Safari >= 6',
      ],
		})) 
		.pipe(sourcemaps.write())
		.pipe(gulp.dest(path.build.css)) 
		.pipe(browsersync.stream()); 
}

function minifyCSS() {
	return gulp
		.src(`${path.build.css}style.css`)
		.pipe(cleanCSS()) 
		.pipe(rename({ suffix: '.min' })) 
		.pipe(gulp.dest(path.build.css)) 
	}

// переносим все libs
function libs() {
	return gulp
		.src(path.src.libs) 
		.pipe(gulp.dest(path.build.libs)) 
		.pipe(browsersync.stream()) 
}

function html() {
	return gulp
		.src(path.src.html)
		.pipe(plumber())
		.pipe(fileInclude()) 
		.pipe(gulp.dest(path.build.html)) 
		.pipe(browsersync.stream()) 
}

async function img() {
	return gulp
		.src(path.src.img, { encoding: false }) 
		.pipe(plumber())
		.pipe(imagemin()) 
		.pipe(gulp.dest(path.build.img)) 
		.pipe(browsersync.stream()) 
}



const isImageFile = (file) => {
    return file.extname === '.jpg' || file.extname === '.jpeg' || file.extname === '.png';
};

async function webp() {
    const { default: webp } = await import('gulp-webp');

    return gulp
        .src(path.src.webp)
        .pipe(plumber())
		.pipe(changed('build/img', { extension: '.webp' }))
        .pipe(gulpIf(isImageFile, webp({ quality: 75 }))) // Установите качество
        
        .pipe(multiDest(['src/img', 'build/img']));
}

export { webp };






function svg() {
	return gulp
		.src(path.src.svg)
		.pipe(plumber())
		.pipe(svgSprite({
			mode: {
				stack: {
					sprite: '../sprite.svg'  
				}
			}
		}
		))
		.pipe(gulp.dest(path.build.svg))
		.pipe(browsersync.stream())
}

function clean() {
	return del('./build');
}

function server() {
	browsersync.init({
		server: {
			baseDir: './build/'
		},
		notify: false, 
		port: 3000
	})
}

function ttfToWoff() {
	return gulp
		.src(path.src.fonts, { encoding: false }) 
		.pipe(ttf2woff()) 
		.pipe(gulp.dest(path.build.fonts)) 
}

function ttfToWoff2() {
	return gulp
		.src(path.src.fonts, { encoding: false }) 
		.pipe(ttf2woff2()) 
		.pipe(gulp.dest(path.build.fonts)); 
}


let srcFonts = 'src/scss/_local-fonts.scss';
let appFonts = 'build/fonts/';

async function fontFace(done) {
    try {
        fs.writeFileSync(srcFonts, '');

        const items = await fs.promises.readdir(appFonts);

        let c_fontname;

        for (const item of items) {
            const [fontname, fontExt] = item.split('.');
            if (fontExt === 'woff' || fontExt === 'woff2') {
                if (c_fontname !== fontname) {
                    const fontFaceString = `@include font-face("${fontname}", "${fontname}", 400);\r\n`;
                    fs.appendFileSync(srcFonts, fontFaceString); 

                    
                    console.log(chalk`
  {bold {bgGray Added new font: ${fontname}.}
  ----------------------------------------------------------------------------------
  {bgYellow.black Please, move mixin call from {cyan src/scss/_local-fonts.scss} to {cyan src/scss/global/_fonts.scss} and then change it!}}
  ----------------------------------------------------------------------------------`);
                }
            }
            c_fontname = fontname; 
        }

        done(); 
    } catch (err) {
        console.error(chalk.red('Error while processing fonts:'), err);
        done(err); 
    }
}



//fontFace

function watchFiles() {
	gulp.watch(path.watch.libs, libs); 
	gulp.watch(path.watch.html, html);
	gulp.watch(path.watch.fonts, fonts);
	gulp.watch(path.watch.css, style);
	gulp.watch(path.watch.js, js);
	gulp.watch(path.watch.img, images);
}

const fonts = gulp.series(ttfToWoff, ttfToWoff2, fontFace);
const images = gulp.series(img, webp);
const mainTasks = gulp.series(clean, gulp.parallel(html, fonts, libs, style, js, images, svg));
const dev = gulp.series(mainTasks, gulp.parallel(watchFiles, server));


const build = gulp.series(clean, gulp.parallel(html, libs, style, js, images, fonts, svg), minifyCSS, minifyJs);

gulp.task('svg', svg);
gulp.task('default', dev);
gulp.task('fonts', fonts);
gulp.task('clean', clean);
gulp.task('build', build);
