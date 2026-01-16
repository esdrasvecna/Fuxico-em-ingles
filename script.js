console.log("Fuxico em Inglês carregado 😄");

const track = document.getElementById('photo-track');

if (track) {
  track.innerHTML += track.innerHTML;

  let pos = 0;

  function animate() {
    pos += 0.4; // velocidade (menor = mais lento)
    const halfWidth = track.scrollWidth / 2;

    if (pos >= halfWidth) {
      pos = 0;
    }

    track.style.transform = `translateX(-${pos}px)`;
    requestAnimationFrame(animate);
  }

  animate();
}
