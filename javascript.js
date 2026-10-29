var intervalAutoPlay = null;
var autoPlay = true;
var numFotoActual = 0;
var llistaFotos = null;
var numFotos = 0;
var maxPassisSlideShow = 33;
var numPassisSlideShow = 0;

function inicialitzacions(){
	llistaFotos = document.getElementById("fotos");
	numFotos = llistaFotos.getElementsByTagName("img").length;
	llistaFotos.children[0].style.opacity = 1;
	llistaFotos.children[0].style.zIndex = "100";

	numPassisSlideShow = maxPassisSlideShow;
	intervalAutoPlay = setInterval('fotoAutoPlay()', 5000);

	/* activa scroll suau al clickar links */
	$(function() {
	  $('a[href*=#]:not([href=#])').click(function() {
	    if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
	      var target = $(this.hash);
	      target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
	      if (target.length) {
	        $("html, body").animate({
	          scrollTop: target.offset().top
	        }, 1000);
	        return false;
	      }
	    }
	  });
	});
}

function corregirOpacitatLogo(){
	document.getElementById("alogo").style.opacity = 1;
}

/************************************ SlideShow *************************************/

function fotoAutoPlay() {
	if (numPassisSlideShow >0) {
		var numFotoSeguent = numFotoActual + 1;
	
		if (numFotoSeguent >= numFotos) { numFotoSeguent = 0; }
		llistaFotos.children[numFotoActual].style.opacity = 0;
		llistaFotos.children[numFotoSeguent].style.opacity = 1;
		llistaFotos.children[numFotoActual].style.zIndex = "0";
		llistaFotos.children[numFotoSeguent].style.zIndex = "100";
		numFotoActual = numFotoSeguent;
		numPassisSlideShow--;
	}
	else {
		fotoPausa();
		numPassisSlideShow = maxPassisSlideShow;
	}
}

function clickFoto(){
	if (autoPlay) { fotoPausa(); }	
	else { fotoPlay(); }
}

function fotoPausa(){
	autoPlay = false;
	clearInterval(intervalAutoPlay);
	document.getElementById("controlPausa").style.display = "none";
	document.getElementById("controlPlay").style.display = "inline-block";
}

function fotoPlay() {
	document.getElementById("controlPausa").style.display = "inline-block";
	document.getElementById("controlPlay").style.display = "none";
	intervalAutoPlay = setInterval('fotoAutoPlay()', 5000);
	autoPlay = true;
	numPassisSlideShow = maxPassisSlideShow;
}

function fotoSeguent(){
	autoPlay = false;
	clearInterval(intervalAutoPlay);
	document.getElementById("controlPausa").style.display = "none";
	document.getElementById("controlPlay").style.display = "inline-block";

	var numFotoSeguent = numFotoActual + 1;
	if (numFotoSeguent >= numFotos) { numFotoSeguent = 0; }

	llistaFotos.children[numFotoActual].style.opacity = 0;
	llistaFotos.children[numFotoSeguent].style.opacity = 1;
	llistaFotos.children[numFotoActual].style.zIndex = "0";
	llistaFotos.children[numFotoSeguent].style.zIndex = "100";
	numFotoActual = numFotoSeguent;
}

function fotoAnterior(){
	autoPlay = false;
	clearInterval(intervalAutoPlay);
	document.getElementById("controlPausa").style.display = "none";
	document.getElementById("controlPlay").style.display = "inline-block";

	var numFotoSeguent = numFotoActual - 1;
	if (numFotoSeguent < 0) { numFotoSeguent = numFotos - 1; }
	llistaFotos.children[numFotoActual].style.opacity = 0;
	llistaFotos.children[numFotoSeguent].style.opacity = 1;
	llistaFotos.children[numFotoActual].style.zIndex = "0";
	llistaFotos.children[numFotoSeguent].style.zIndex = "100";
	numFotoActual = numFotoSeguent;
}

/************************************ Contacte *************************************/

function ampliacioFoto(foto){
	if (foto.style.width <= "15em") {
		foto.style.width = "95%";
	}
	else {
		foto.style.width = "15em";
	}
}

/************************************ Credits *************************************/

var algunTreballAmpliat = false;
var treballAmpliatAnterior = null;
var tipusLlistat = "quadricula";

function ampliaTreball(treball){
	var restauraClasse = "";
	var rutaPortada = "";
	var nomPortada = "";
	
	if (tipusLlistat == "quadricula") {
		restauraClasse = "treballQuadricula";
	}
	else {
		restauraClasse = "treballLlista";
	}

	if (algunTreballAmpliat) {	// hi ha alguna portada ampliada
		if (treball == treballAmpliatAnterior) {	// hem fet click a la única portada ampliada i la minimitzem
			treballAmpliatAnterior.className = restauraClasse;
			algunTreballAmpliat = false;
			// deixem la portada restaurada en alta resolució
		}

		else {	// hi ha una portada ampliada i hem fet click a una nova portada no ampliada
			treballAmpliatAnterior.className = restauraClasse;
			treball.className = "treballAmpliat";

			// obtenim el nom de l'arxiu en miniatura i el posem en alta resolució
			rutaPortada = treball.getElementsByClassName("treballPortada")[0].src;
			nomPortada = rutaPortada.substring(rutaPortada.lastIndexOf('/')+1);
			treball.getElementsByClassName("treballPortada")[0].src = "portades/" + nomPortada;

			treballAmpliatAnterior = treball;
			algunTreballAmpliat = true;
		}
	}
	else {	// no hi ha cap portada ampliada
		treball.className = "treballAmpliat";

		// obtenim el nom de l'arxiu en miniatura i el posem en alta resolució
		rutaPortada = treball.getElementsByClassName("treballPortada")[0].src;
		nomPortada = rutaPortada.substring(rutaPortada.lastIndexOf('/')+1);
		treball.getElementsByClassName("treballPortada")[0].src = "portades/" + nomPortada;

		treballAmpliatAnterior = treball;
		algunTreballAmpliat = true;
	}
}

function clickBotoLlistat() {
	var imatgeBotoLlistat = document.getElementById("botoLlistat");
	var llistatCredits = null;
	var longitud = 0;

	if (tipusLlistat == "quadricula") {
		llistatCredits = document.getElementsByClassName("treballQuadricula");
		longitud = llistatCredits.length;
		tipusLlistat = "llista";
		imatgeBotoLlistat.src = "logos/botoQuadricula.svg"

		for (var i = 0; i < longitud; i++ ) {
			llistatCredits[0].className = "treballLlista";
		}
	}
	else {
		llistatCredits = document.getElementsByClassName("treballLlista");
		longitud = llistatCredits.length;
		tipusLlistat = "quadricula";
		imatgeBotoLlistat.src = "logos/botoLlista.svg";

		for (var i = 0; i < longitud; i++ ) {
			llistatCredits[0].className = "treballQuadricula";
		}
	}
}