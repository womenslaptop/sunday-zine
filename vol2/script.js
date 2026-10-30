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


const RENDER_WIDTH_DESKTOP =
  1600;

const RENDER_WIDTH_TOUCH =
  1000;


let pageRatio =
  258 / 183;

let pageFlip =
  null;

let pdfDocument =
  null;

let totalPages =
  0;

let currentPageIndex =
  0;


const pageElements =
  [];

const pageImageUrls =
  new Map();

const renderPromises =
  new Map();


function isTouchDevice() {

  return (
    window.matchMedia(
      "(pointer: coarse)"
    ).matches ||

    "ontouchstart" in window
  );

}


function getBookSize() {

  const portrait =
    window.innerWidth <= 700;

  const availableWidth =
    main.clientWidth;

  const availableHeight =
    main.clientHeight;


  let pageWidth;


  if (portrait) {

    const widthLimit =
      availableWidth - 16;

    const heightLimit =
      (
        availableHeight - 8
      ) / pageRatio;


    pageWidth =
      Math.min(
        widthLimit,
        heightLimit
      );

  } else {

    const widthLimit =
      (
        availableWidth - 32
      ) / 2;

    const heightLimit =
      (
        availableHeight - 12
      ) / pageRatio;


    pageWidth =
      Math.min(
        widthLimit,
        heightLimit
      );

  }


  pageWidth =
    Math.floor(
      pageWidth
    );


  const pageHeight =
    Math.floor(
      pageWidth *
      pageRatio
    );


  return {
    width: pageWidth,
    height: pageHeight
  };

}


function canvasToPngBlob(
  canvas
) {

  return new Promise(
    function (
      resolve,
      reject
    ) {

      canvas.toBlob(
        function (
          blob
        ) {

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


function waitForImage(
  image
) {

  if (
    image.complete &&
    image.naturalWidth > 0
  ) {

    return Promise.resolve();

  }


  return new Promise(
    function (
      resolve,
      reject
    ) {

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


function createPageShells() {

  for (
    let pageNumber = 1;
    pageNumber <= totalPages;
    pageNumber++
  ) {

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


    book.appendChild(
      pageElement
    );


    pageElements.push(
      pageElement
    );

  }

}


async function renderPage(
  pageNumber
) {

  if (
    pageNumber < 1 ||
    pageNumber > totalPages
  ) {

    return;

  }


  if (
    pageImageUrls.has(
      pageNumber
    )
  ) {

    return;

  }


  if (
    renderPromises.has(
      pageNumber
    )
  ) {

    return renderPromises.get(
      pageNumber
    );

  }


  const renderPromise =
    (async function () {

      const page =
        await pdfDocument.getPage(
          pageNumber
        );


      const originalViewport =
        page.getViewport({
          scale: 1
        });


      const renderWidth =
        isTouchDevice()
          ? RENDER_WIDTH_TOUCH
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

        canvasContext:
          context,

        viewport:
          viewport

      }).promise;


      const blob =
        await canvasToPngBlob(
          canvas
        );


      const imageUrl =
        URL.createObjectURL(
          blob
        );


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


      await waitForImage(
        image
      );


      const pageElement =
        pageElements[
          pageNumber - 1
        ];


      pageElement.innerHTML =
        "";


      pageElement.appendChild(
        image
      );


      pageImageUrls.set(
        pageNumber,
        imageUrl
      );


      canvas.width =
        1;

      canvas.height =
        1;


      page.cleanup();

    })();


  renderPromises.set(
    pageNumber,
    renderPromise
  );


  try {

    await renderPromise;

  } finally {

    renderPromises.delete(
      pageNumber
    );

  }

}


async function renderAround(
  pageIndex
) {

  const pageNumber =
    pageIndex + 1;


  const targets = [

    pageNumber,

    pageNumber + 1,

    pageNumber + 2,

    pageNumber + 3,

    pageNumber - 1,

    pageNumber - 2

  ];


  for (
    const target
    of targets
  ) {

    if (
      target >= 1 &&
      target <= totalPages
    ) {

      try {

        await renderPage(
          target
        );

      } catch (
        error
      ) {

        console.error(
          error
        );

      }

    }

  }


  if (
    isTouchDevice()
  ) {

    unloadFarPages(
      pageIndex
    );

  }

}


function unloadFarPages(
  pageIndex
) {

  const currentPageNumber =
    pageIndex + 1;


  for (
    const [
      pageNumber,
      imageUrl
    ]
    of pageImageUrls
  ) {

    const distance =
      Math.abs(
        pageNumber -
        currentPageNumber
      );


    if (
      distance > 6
    ) {

      const pageElement =
        pageElements[
          pageNumber - 1
        ];


      pageElement.innerHTML =
        "";


      URL.revokeObjectURL(
        imageUrl
      );


      pageImageUrls.delete(
        pageNumber
      );

    }

  }

}


function updateCounter(
  pageIndex
) {

  currentPageIndex =
    pageIndex;


  const currentPage =
    Math.min(
      pageIndex + 1,
      totalPages
    );


  pageCounter.textContent =
    String(
      currentPage
    ).padStart(
      2,
      "0"
    ) +
    " / " +
    String(
      totalPages
    ).padStart(
      2,
      "0"
    );


  prevButton.disabled =
    pageIndex <= 0;


  nextButton.disabled =
    pageIndex >=
    totalPages - 1;

}


/*
  다음 페이지

  StPageFlip 내부의 실제 현재 페이지 위치를
  직접 읽어서 이동한다.
*/
async function goNext() {

  if (!pageFlip) {

    return;

  }


  const actualIndex =
    pageFlip.getCurrentPageIndex();


  if (
    actualIndex >=
    totalPages - 1
  ) {

    return;

  }


  const nextIndex =
    Math.min(
      actualIndex + 1,
      totalPages - 1
    );


  /*
    실제로 바로 보여질 페이지만 먼저 준비한다.
  */
  await Promise.all([

    renderPage(
      nextIndex + 1
    ),

    nextIndex + 2 <= totalPages
      ? renderPage(
          nextIndex + 2
        )
      : Promise.resolve()

  ]);


  pageFlip.flipNext();

}


/*
  이전 페이지

  별도로 저장해둔 currentPageIndex가 아니라
  StPageFlip의 실제 현재 위치를 기준으로 한다.
*/
async function goPrev() {

  if (!pageFlip) {

    return;

  }


  const actualIndex =
    pageFlip.getCurrentPageIndex();


  if (
    actualIndex <= 0
  ) {

    return;

  }


  const prevIndex =
    Math.max(
      0,
      actualIndex - 1
    );


  /*
    이전으로 돌아갔을 때 필요한 페이지만 먼저 준비한다.
  */
  await Promise.all([

    renderPage(
      prevIndex + 1
    ),

    prevIndex >= 1
      ? renderPage(
          prevIndex
        )
      : Promise.resolve()

  ]);


  pageFlip.flipPrev();

}


/*
  모바일 / 터치 조작

  1 finger:
  왼쪽 탭 = 이전
  오른쪽 탭 = 다음
  좌우 swipe = 페이지 이동

  2 fingers:
  브라우저 pinch zoom에 넘기고
  페이지 이동은 실행하지 않음.
*/
function enableTouchNavigation() {

  if (
    !isTouchDevice()
  ) {

    return;

  }


  const activePointers =
    new Set();


  let gestureHadMultiplePointers =
    false;


  let startX =
    0;

  let startY =
    0;

  let startTime =
    0;


  book.addEventListener(
    "pointerdown",

    function (
      event
    ) {

      activePointers.add(
        event.pointerId
      );


      if (
        activePointers.size > 1
      ) {

        gestureHadMultiplePointers =
          true;

        return;

      }


      startX =
        event.clientX;

      startY =
        event.clientY;

      startTime =
        Date.now();

    },

    {
      passive: true
    }
  );


  book.addEventListener(
    "pointerup",

    function (
      event
    ) {

      /*
        두 손가락 이상이 사용된 동작이면
        pinch zoom으로 간주하고
        페이지 넘김은 하지 않는다.
      */
      if (
        gestureHadMultiplePointers
      ) {

        activePointers.delete(
          event.pointerId
        );


        if (
          activePointers.size === 0
        ) {

          gestureHadMultiplePointers =
            false;

        }


        return;

      }


      const endX =
        event.clientX;

      const endY =
        event.clientY;


      const deltaX =
        endX -
        startX;

      const deltaY =
        endY -
        startY;


      const duration =
        Date.now() -
        startTime;


      activePointers.delete(
        event.pointerId
      );


      /*
        좌우 swipe
      */
      if (
        Math.abs(
          deltaX
        ) > 30 &&
        Math.abs(
          deltaX
        ) >
        Math.abs(
          deltaY
        )
      ) {

        if (
          deltaX < 0
        ) {

          goNext();

        } else {

          goPrev();

        }


        return;

      }


      /*
        짧은 탭

        책 왼쪽 절반 = 이전
        책 오른쪽 절반 = 다음
      */
      if (
        Math.abs(
          deltaX
        ) < 14 &&
        Math.abs(
          deltaY
        ) < 14 &&
        duration < 600
      ) {

        const rect =
          book.getBoundingClientRect();


        const tapPosition =
          endX -
          rect.left;


        if (
          tapPosition <
          rect.width / 2
        ) {

          goPrev();

        } else {

          goNext();

        }

      }

    },

    {
      passive: true
    }
  );


  /*
    Safari가 pinch/scroll 처리를 시작하면
    pointercancel이 발생할 수 있다.
  */
  book.addEventListener(
    "pointercancel",

    function (
      event
    ) {

      activePointers.delete(
        event.pointerId
      );


      if (
        activePointers.size === 0
      ) {

        gestureHadMultiplePointers =
          false;

      }

    },

    {
      passive: true
    }
  );

}


async function startViewer() {

  try {

    if (
      typeof pdfjsLib ===
      "undefined"
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

        url:
          pdfUrl,

        isOffscreenCanvasSupported:
          false

      });


    pdfDocument =
      await loadingTask.promise;


    totalPages =
      pdfDocument.numPages;


    const firstPage =
      await pdfDocument.getPage(
        1
      );


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
      String(
        totalPages
      ).padStart(
        2,
        "0"
      );


    createPageShells();


    status.textContent =
      "표지를 불러오는 중...";


    /*
      표지만 먼저 렌더링한다.
    */
    await renderPage(
      1
    );


    controls.hidden =
      false;


    controls.style.visibility =
      "hidden";


    const bookSize =
      getBookSize();


    const touchDevice =
      isTouchDevice();


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
            650,

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

          /*
            PC는 기존 PageFlip 동작 사용.
            모바일은 우리가 직접 탭/스와이프 처리.
          */
          useMouseEvents:
            !touchDevice,

          disableFlipByClick:
            touchDevice,

          showPageCorners:
            !touchDevice

        }
      );


    pageFlip.on(
      "init",

      function (
        event
      ) {

        status.style.display =
          "none";


        book.classList.add(
          "ready"
        );


        controls.style.visibility =
          "visible";


        let initialPage =
          0;


        if (
          event.data &&
          typeof event.data.page ===
          "number"
        ) {

          initialPage =
            event.data.page;

        }


        updateCounter(
          initialPage
        );


        /*
          책을 먼저 보여준 뒤
          주변 페이지를 준비한다.
        */
        renderAround(
          initialPage
        );

      }
    );


    pageFlip.on(
      "flip",

      function (
        event
      ) {

        updateCounter(
          event.data
        );


        /*
          이동 완료 후 주변 페이지 준비.
        */
        renderAround(
          event.data
        );

      }
    );


    pageFlip.loadFromHTML(
      book.querySelectorAll(
        ".page"
      )
    );


    enableTouchNavigation();


    /*
      하단 ← 버튼
    */
    prevButton.addEventListener(
      "click",

      function () {

        goPrev();

      }
    );


    /*
      하단 → 버튼
    */
    nextButton.addEventListener(
      "click",

      function () {

        goNext();

      }
    );


    /*
      PC 키보드
    */
    document.addEventListener(
      "keydown",

      function (
        event
      ) {

        if (
          event.key ===
          "ArrowLeft"
        ) {

          goPrev();

        }


        if (
          event.key ===
          "ArrowRight"
        ) {

          goNext();

        }

      }
    );


  } catch (
    error
  ) {

    console.error(
      error
    );


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
      const imageUrl
      of pageImageUrls.values()
    ) {

      URL.revokeObjectURL(
        imageUrl
      );

    }


    if (
      pdfDocument
    ) {

      pdfDocument.destroy();

    }

  }
);


startViewer();