function setVideoHeight() {
    const videoContainers = document.querySelectorAll('.video-container');
    const videoAspectRatio = 16 / 9; // Соотношение сторон видео, в данном случае 16:9
  
    videoContainers.forEach(container => {
      const containerWidth = container.offsetWidth;
      const containerHeight = containerWidth / videoAspectRatio;
      container.style.setProperty('--video-height', `${containerHeight}px`);
    });
  }
  
  window.addEventListener('resize', setVideoHeight);
  setVideoHeight(); // Вызвать функцию сразу после загрузки страницы