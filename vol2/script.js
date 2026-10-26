pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";


const pdfUrl =
  "./SUNDAY_ZINE_VOL2_AUTOSAVE.pdf";


const main =
  document.querySelector("main");

const book =
  document.getElementById("book");

const status =
  document.getElementById("status");

const controls =
  document.getElementById("controls");

const prevButton =
  document.getElementById("prev");

const nextButton =
  document.getElementById("next");

const pageCounter =
  document.getElementById("page-counter");


const RENDER_WIDTH_DESKTOP = 1600;
const RENDER_WIDTH_MOBILE = 1100;

let pageRatio = 258 / 183;

let pageFlip = null;

let totalPages = 0;

const temporaryImageUrls = [];


function isMobileDevice() {
  return window.innerWidth <= 700;
}


function getBookSize() {

  const isMobile =
    isMobileDevice();

  const availableWidth =
    main.clientWidth;

  const availableHeight =
    main.clientHeight;

  let pageWidth;

  if (isMobile) {

    const widthLimit =
      availableWidth - 16;

    const heightLimit =
      (availableHeight - 8) /
      pageRatio;

    pageWidth =
      Math.min(
        widthLimit,
        heightLimit
      );

  } else {

    const widthLimit =
      (availableWidth - 32) / 2;

    const heightLimit =
      (availableHeight - 12) /
      pageRatio;

    pageWidth =
      Math.min(
        widthLimit,
        heightLimit
      );

  }

  pageWidth =
    Math.floor(pageWidth);

  const pageHeight =
    Math.floor(
      pageWidth * pageRatio
    );

  return {
    width: pageWidth,
    height: pageHeight
  };
}


function canvasToPngBlob(canvas) {

  return new Promise(
    (resolve, reject) => {

      canvas.toBlob(
        function (blob) {

          if (blob) {

            resolve(blob);

          } else {

            reject(
              new Error(
                "페이지 이미지를 만들 수 없습니다."
              )
            );

          }

        },
        "image/png"
      );

    }
  );

}


function waitForImage(image) {

  if (
    image.complete &&
    image.naturalWidth > 0
  ) {
    return Promise.resolve();
  }

  return new Promise(
    function (resolve, reject) {

      image.onload =
        function () {
          resolve();
        };

      image.onerror =
        function () {
          reject(
            new Error(
              "페이지 이미지를 불러올 수 없습니다."
            )
          );
        };

    }
  );

}


function updateCounter(pageIndex) {

  const currentPage =
    Math.min(
      pageIndex + 1,
      totalPages
    );

  pageCounter.textContent =
    String(currentPage).padStart(2, "0") +
    " / " +
    String(totalPages).padStart(2, "0");

  prevButton.disabled =
    pageIndex <= 0;

  nextButton.disabled =
    pageIndex >= totalPages - 1;

}


async function createPageImage(
  pdf,
  pageNumber
) {

  const page =
    await pdf.getPage(
      pageNumber
    );

  const originalViewport =
    page.getViewport({
      scale: 1
    });

  const renderWidth =
    isMobileDevice()
      ? RENDER_WIDTH_MOBILE
      : RENDER_WIDTH_DESKTOP;

  const renderScale =
    renderWidth /
    originalViewport.width;

  const viewport =
    page.getViewport({
      scale: renderScale
    });

  const canvas =
    document.createElement(
      "canvas"
    );

  const context =
    canvas.getContext(
      "2d",
      {
        alpha: false
      }
    );

  if (!context) {
    throw new Error(
      "Canvas를 만들 수 없습니다."
    );
  }

  canvas.width =
    Math.ceil(
      viewport.width
    );

  canvas.height =
    Math.ceil(
      viewport.height
    );

  context.fillStyle =
    "#ffffff";

  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;

  const blob =
    await canvasToPngBlob(
      canvas
    );

  const imageUrl =
    URL.createObjectURL(
      blob
    );

  temporaryImageUrls.push(
    imageUrl
  );

  const pageElement =
    document.createElement(
      "div"
    );

  pageElement.className =
    "page";

  if (
    pageNumber === 1 ||
    pageNumber === totalPages
  ) {
    pageElement.dataset.density =
      "hard";
  }

  const image =
    document.createElement(
      "img"
    );

  image.src =
    imageUrl;

  image.alt =
    "SUNDAY ZINE Vol.2 page " +
    pageNumber;

  image.draggable =
    false;

  pageElement.appendChild(
    image
  );

  book.appendChild(
    pageElement
  );

  await waitForImage(
    image
  );

  canvas.width = 1;
  canvas.height = 1;

  page.cleanup();

}


async function startViewer() {

  try {

    if (
      typeof pdfjsLib === "undefined"
    ) {
      throw new Error(
        "PDF 라이브러리를 불러오지 못했습니다."
      );
    }

    if (
      !window.St ||
      !window.St.PageFlip
    ) {
      throw new Error(
        "플립북 라이브러리를 불러오지 못했습니다."
      );
    }

    const loadingTask =
      pdfjsLib.getDocument({
        url: pdfUrl
      });

    const pdf =
      await loadingTask.promise;

    totalPages =
      pdf.numPages;

    const firstPage =
      await pdf.getPage(1);

    const firstViewport =
      firstPage.getViewport({
        scale: 1
      });

    pageRatio =
      firstViewport.height /
      firstViewport.width;

    firstPage.cleanup();

    pageCounter.textContent =
      "01 / " +
      String(totalPages).padStart(2, "0");

    for (
      let pageNumber = 1;
      pageNumber <= totalPages;
      pageNumber++
    ) {

      status.textContent =
        "페이지 준비 중 " +
        pageNumber +
        " / " +
        totalPages;

      await createPageImage(
        pdf,
        pageNumber
      );

    }

    controls.hidden =
      false;

    controls.style.visibility =
      "hidden";

    const bookSize =
      getBookSize();

    pageFlip =
      new window.St.PageFlip(
        book,
        {

          width:
            bookSize.width,

          height:
            bookSize.height,

          size:
            "fixed",

          startPage:
            0,

          drawShadow:
            true,

          flippingTime:
            700,

          usePortrait:
            true,

          autoSize:
            true,

          maxShadowOpacity:
            0.22,

          showCover:
            true,

          mobileScrollSupport:
            true,

          swipeDistance:
            30,

          useMouseEvents:
            true,

          showPageCorners:
            true,

          disableFlipByClick:
            false

        }
      );

    pageFlip.on(
      "init",
      function (event) {

        status.style.display =
          "none";

        book.classList.add(
          "ready"
        );

        controls.style.visibility =
          "visible";

        if (
          event.data &&
          typeof event.data.page === "number"
        ) {

          updateCounter(
            event.data.page
          );

        } else {

          updateCounter(0);

        }

      }
    );

    pageFlip.on(
      "flip",
      function (event) {

        updateCounter(
          event.data
        );

      }
    );

    pageFlip.loadFromHTML(
      book.querySelectorAll(
        ".page"
      )
    );

    prevButton.addEventListener(
      "click",
      function () {

        pageFlip.flipPrev();

      }
    );

    nextButton.addEventListener(
      "click",
      function () {

        pageFlip.flipNext();

      }
    );

    document.addEventListener(
      "keydown",
      function (event) {

        if (
          event.key ===
          "ArrowLeft"
        ) {

          pageFlip.flipPrev();

        }

        if (
          event.key ===
          "ArrowRight"
        ) {

          pageFlip.flipNext();

        }

      }
    );

  } catch (error) {

    console.error(error);

    book.classList.remove(
      "ready"
    );

    controls.hidden =
      true;

    status.style.display =
      "block";

    status.textContent =
      "플립북을 불러오지 못했습니다. 페이지를 새로고침해주세요.";

  }

}


window.addEventListener(
  "beforeunload",
  function () {

    for (
      const url of temporaryImageUrls
    ) {

      URL.revokeObjectURL(
        url
      );

    }

  }
);


startViewer();