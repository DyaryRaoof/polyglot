import { useRef } from 'react';
import smaple from './video.mp4';
import { useEffect, useState } from 'react';
import text from './intouchables.srt';
import engText from './intouchables-eng.srt';
import './App.css';

function App() {
  const videoRef = useRef();
  const [displaySub, setDisplaySub] = useState('');
  const [displaySubEng, setDisplayEngSub] = useState('');

  const convertToSeconds = (time) => {
    const hour = parseInt(time.split(':')[0]);
    const minute = parseInt(time.split(':')[1]);
    const seconds = parseFloat(time.split(':')[2].replace(',', '.'));
    const allSeconds = hour * 60 * 60 + minute * 60 + seconds;
    return allSeconds;
  };

  const makeSubTextReady = (text, currentTime, isEng) => {
    if (text) {
      const textArray = text.split('\n').map((text) => text.split('\r')[0]);
      const lines = textArray.filter((text) => text.includes('-->'));
      const timeLines = lines.filter((line) => convertToSeconds(line.split('-->')[0]) < currentTime);
      const currentTimeLine = timeLines[timeLines.length - 1];
      const indexOfLine = textArray.indexOf(currentTimeLine);

      const sub = `${textArray[indexOfLine + 1]} \n ${textArray[indexOfLine + 2]}`;
      if (currentTimeLine) {
        const currentSeconds = convertToSeconds(currentTimeLine.split('-->')[0]);
        localStorage.setItem('currentTime', currentSeconds);
        if (currentTime > currentSeconds && displaySub !== sub) {
          if (isEng) return setDisplayEngSub(sub);
          setDisplaySub(sub);
        }
      }
    }
  };

  useEffect(() => {
    fetch(text)
      .then((r) => r.text())
      .then((text) => {
        localStorage.setItem('sub', JSON.stringify(text));
        makeSubTextReady(text, 0, false);
      });
    fetch(engText)
      .then((r) => r.text())
      .then((text) => {
        localStorage.setItem('sub-eng', JSON.stringify(text));
        makeSubTextReady(text, 0, true);
      });

    videoRef.current.ontimeupdate = () => {
      const currentTime = videoRef.current.currentTime;
      const text = JSON.parse(localStorage.getItem('sub'));
      const textEng = JSON.parse(localStorage.getItem('sub-eng'));
      makeSubTextReady(text, currentTime, false);
      makeSubTextReady(textEng, currentTime, true);
    };
  }, []);

  const handleVideoInputChange = (e) => {
    localStorage.clear();
    //load only a portion of video duration from file
    const video = e.target.files[0];
    const objectURL = URL.createObjectURL(video);
    videoRef.current.src = objectURL;
  };

  const handleSubInput = (e, fileName) => {
    const sub = e.target.files[0];
    const reader = new FileReader();
    reader.readAsText(sub);
    reader.onload = () => {
      localStorage.setItem(fileName, JSON.stringify(reader.result));
    };
  };

  const handleSubtitleFrenchInput = (e) => {
    handleSubInput(e, 'sub');
  };

  const handleSubtitleEnglishInput = (e) => {
    handleSubInput(e, 'sub-eng');
  };

  const handleInventoryInput = (e) => {
    handleSubInput(e, 'inventory');
  };

  async function getNewFileHandle() {
    const options = {
      suggestedName: 'inventory',
      startIn: 'Desktop',
      types: [
        {
          description: 'Text Files',
          accept: {
            'text/plain': ['.txt'],
          },
        },
      ],
    };
    const handle = await window.showSaveFilePicker(options);
    return handle;
  }

  async function writeFile(fileHandle, contents) {
    // Create a FileSystemWritableFileStream to write to.
    const writable = await fileHandle.createWritable();
    // Write the contents of the file to the stream.
    await writable.write(contents);
    // Close the file and write the contents to disk.
    await writable.close();
  }

  const localInventory = localStorage.getItem('inventory');
  let inventoryNow = [];
  if (localInventory) {
    inventoryNow = JSON.parse(localInventory).split('\n');
  }

  const handleSaveSubtitle = () => {
    const currentTime = localStorage.getItem('currentTime');
    const saveText = `${currentTime}-->fr: ${displaySub}-->eng: ${displaySubEng}`;

    const inventory = JSON.parse(localStorage.getItem('inventory'));
    let newInventory = null;

    if (inventory) {
      const inventoryArray = inventory.split('\n');
      inventoryArray.push(saveText);
      newInventory = inventoryArray.join('\n');
    } else {
      newInventory = saveText;
    }

    getNewFileHandle().then((handle) => {
      writeFile(handle, newInventory).then(() => {
        console.log('file written');
        localStorage.setItem('inventory', JSON.stringify(newInventory));
      });
    });
  };

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ flex: 1, height: '100vh', overflow: 'scroll', marginLeft: '30px', paddingRight: '20px' }}>
        {inventoryNow.map((item, index) => {
          if (item === ' ') {
            return null;
          }
          return (
            <div key={index} className={item.includes('eng: ') ? 'eng-button' : ''}>
              <span style={{ color: 'red', fontSize: '30px' }}>{index % 3 !== 0 ? index : ''}</span>
              <button
                style={{ pointer: 'cursor' }}
                key={item}
                onClick={() => {
                  videoRef.current.currentTime = parseFloat(item.split('-->')[0]);
                }}
              >
                <div className={item.includes('fr: ') ? 'fr trans' : 'eng trans'}>{`${item.includes('fr: ') ? item.split('fr: ')[1] : ''} ${item.includes('eng: ') ? item.split('eng: ')[1] : ''}`}</div>
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', flex: 5 }}>
        <video controls width="100%" ref={videoRef} preload={false}>
          <source src={smaple} type="video/mp4"></source>
        </video>
        <h1 className="trans fr">{displaySub}</h1>
        <h1 className="trans eng">{displaySubEng}</h1>
        <button
          style={{ color: 'orange', padding: '20px', fontSize: '20px', border: '1px solid orange' }}
          onClick={() => {
            handleSaveSubtitle();
          }}
        >
          Save To Inventory
        </button>

        <div style={{ display: 'flex' }}>
          <h3>Choose Video</h3>
          <input type="file" onChange={(e) => handleVideoInputChange(e)} style={{ margin: '20px' }}></input>
        </div>
        <div style={{ display: 'flex' }}>
          <h3>Choose French Sub</h3>
          <input type="file" onChange={(e) => handleSubtitleFrenchInput(e)} style={{ margin: '20px' }}></input>
        </div>
        <div style={{ display: 'flex' }}>
          <h3>Choose English Sub</h3>
          <input type="file" onChange={(e) => handleSubtitleEnglishInput(e)} style={{ margin: '20px' }}></input>
        </div>
        <div style={{ display: 'flex' }}>
          <h3>Choose Inventory File</h3>
          <input type="file" onChange={(e) => handleInventoryInput(e)} style={{ margin: '20px' }}></input>
        </div>
      </div>
    </div>
  );
}

export default App;
