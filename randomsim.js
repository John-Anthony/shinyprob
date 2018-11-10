var workers = [];
var workerstats = {};

function runSimulation(event) {
  event.preventDefault();
  killWorkers();
  resetRows();
  resetStats();
  var sims = Number(document.getElementById("numsims").value);
  var thresh = Number(document.getElementById("threshold").value);
  var runs = Number(document.getElementById("numruns").value);
  var prob = Number(document.getElementById("simprob").value);
  document.getElementById('threshspan').innerHTML = thresh;
  document.getElementById('countspan').innerHTML = thresh;
  workerstats.threshold = thresh;
  for (var i = 0; i < sims; i++) {
    workers[i] = new Worker("randworker.js");
    workers[i].id = i;
    workers[i].stats = {}; // setup a new place to keep track of this workers stats
    addRow(i);
    workers[i].addEventListener('message',function(e){
      // worker sends back [id, successes, total, currentrand, currentprob]
      updateRow(e.data);
      updateStats(e.data);
    });
    workers[i].postMessage([i,runs,prob,thresh]);
  }
}

function resetStats() {
  workerstats.maxshinies = false;
  workerstats.minshinies = false;
  workerstats.totshinies = 0;
  workerstats.maxruns = false;
  workerstats.minruns = false;
  workerstats.totruns = 0;
  workerstats.successful = []; // init an empty array of workers who have reached the threshold
}

function addRow(i) {
  var tbl = document.getElementById('simtbl');
  var row = tbl.insertRow(-1);
  row.setAttribute('id','row'+i);
  var cell = row.insertCell(-1);
  cell.innerHTML = i+1;
  cell = row.insertCell(-1);
  cell.setAttribute('id','total'+i);
  cell = row.insertCell(-1);
  cell.setAttribute('id','succ'+i);
  cell = row.insertCell(-1);
  cell.setAttribute('id','prob'+i);
  cell = row.insertCell(-1);
  cell.setAttribute('id','cur'+i);
}

function updateRow(data) {
  var i = data[0]; // worker who sent their data to us
  var totalcell = document.getElementById('total'+i);
  totalcell.innerHTML = data[2];
  var succcell = document.getElementById('succ'+i);
  succcell.innerHTML = data[1];
  if (data[3]<data[4]) {
    // we have a winner ... let's freeze this winner by inserting a cell
    var row = document.getElementById('row'+i);
    var cell = row.insertCell(-1);
    cell.innerHTML = data[3] + ' ('+data[2]+')';
    cell.classList.add('winningprob');
  }
  var curcell = document.getElementById('cur'+i);
  curcell.innerHTML = data[3];
  var probcell = document.getElementById('prob'+i);
  probcell.innerHTML = data[4];
}

function updateStats(data) {
  updateAllStats(data);
  updateSuccessful(data);
}

function updateAllStats(data) {
  let worker = workers[data[0]];
  worker.stats.total = data[2];
  worker.stats.succ = data[1];
  // no easy way to optimixe this one unless you kept track of the worker(s)
  // who had the min number of shinies and then when they got a new shiny
  // you updated the minimum number of shinies.
  // Far easier to simply reanalyze all workers
  workerstats.totshinies = 0;
  workerstats.minshinies = false;
  workerstats.maxshinies = false;
  for (let w of workers) {
    if (w.stats.total>0) {
      if (workerstats.maxshinies===false || w.stats.succ>workerstats.maxshinies) {
        workerstats.maxshinies = w.stats.succ;
      }
      if (workerstats.minshinies===false || w.stats.succ<workerstats.minshinies) {
        workerstats.minshinies = w.stats.succ;
      }
      workerstats.totshinies += w.stats.succ;
    }
  }

  let avg = Math.round(workerstats.totshinies*10/workers.length)/10.0;
  document.getElementById('avgshinycount').innerHTML = avg;
  if (workerstats.minshinies===false || workerstats.maxshinies==false) {
    document.getElementById('shinystats').innerHTML = 0 + " / " + 0;
  } else {
    document.getElementById('shinystats').innerHTML = workerstats.minshinies + " / " + workerstats.maxshinies;
  }
}

// keep track of how many workers have reached threshold
function updateSuccessful(data) {
  let hit = false;
  for (let w of workerstats.successful) {
    if (w.id == data[0]) {
      hit = true;
      break;
    }
  }
  if (!hit && data[1] >= workerstats.threshold) {
    let w = workers[data[0]];
    workerstats.totruns += w.stats.total; // only count the number of encounters for those who have reached the threshold
    workerstats.successful.push(w);
    if (workerstats.maxruns===false || w.stats.total>workerstats.maxruns) {
      workerstats.maxruns = w.stats.total;
    }
    if (workerstats.minruns===false || w.stats.total<workerstats.minruns) {
      workerstats.minruns = w.stats.total;
    }
  }
  document.getElementById('anacount').innerHTML = workerstats.successful.length;
  let avgruns = workerstats.successful.length>0?Math.round(workerstats.totruns/workerstats.successful.length):0;
  if (workerstats.minruns===false||workerstats.maxruns===false) {
    document.getElementById('anastats').innerHTML = 0 + " / " + 0 + " / " + 0;
  } else {
    document.getElementById('anastats').innerHTML = avgruns + " / " + workerstats.minruns + " / " + workerstats.maxruns;
  }
  if (workerstats.threshold>0) {
    highlightEncounters();
  } else {
    highlightShinies();
  }
}

function highlightShinies() {
  if (workerstats.maxshinies===false || workerstats.minshinies===false) {
    return; // if we don't have any winners/losers yet, don't highlight anything
  }
  for (let w of workers) {
    var workerrow = document.getElementById('row'+w.id);
    workerrow.classList.remove('w3-red'); // remove any current highlights
    workerrow.classList.remove('w3-green');
    if (w.stats.succ === workerstats.minshinies) {
      workerrow.classList.add('w3-red'); // remove any current highlights
    } else if (w.stats.succ === workerstats.maxshinies) {
      workerrow.classList.add('w3-green'); // remove any current highlights
    }
  }
}

function highlightEncounters() {
  if (workerstats.maxruns===false || workerstats.minruns===false) {
    return; // if we don't have any winners/losers yet, don't highlight anything
  }
  for (let w of workerstats.successful) {
    var workerrow = document.getElementById('row'+w.id);
    workerrow.classList.remove('w3-red'); // remove any current highlights
    workerrow.classList.remove('w3-green');
    if (w.stats.total === workerstats.maxruns) {
      workerrow.classList.add('w3-red'); // remove any current highlights
    } else if (w.stats.total === workerstats.minruns) {
      workerrow.classList.add('w3-green'); // remove any current highlights
    }
  }
}

function hideForms() {
  if (event)
    event.preventDefault();
  document.getElementById('formpanel').style.display = 'none';
  document.getElementById('avgpanel').style.opacity = 0.6;
  document.getElementById('encpanel').style.opacity = 0.6;
  document.getElementById('menuoverview').classList.remove('w3-blue');
  document.getElementById('menuoverview').classList.add('w3-blue');
  document.getElementById('menuavg').classList.remove('w3-blue');
  document.getElementById('menuenc').classList.remove('w3-blue');
}

function showAverageForm() {
  event.preventDefault();
  document.getElementById('counttbl').style.display = '';
  document.getElementById('threshtbl').style.display = 'none';
  document.getElementById('formpanel').style.display = '';
  document.getElementById('threshold').value = '0';
  document.getElementById('threshold').style.display = 'none';
  document.getElementById('thresholdlabel').style.display = 'none';
  document.getElementById('avgpanel').style.opacity = 1;
  document.getElementById('encpanel').style.opacity = 0.6;
  document.getElementById('menuavg').classList.remove('w3-blue');
  document.getElementById('menuavg').classList.add('w3-blue');
  document.getElementById('menuoverview').classList.remove('w3-blue');
  document.getElementById('menuenc').classList.remove('w3-blue');
}

function showEncounterForm() {
  event.preventDefault();
  document.getElementById('counttbl').style.display = 'none';
  document.getElementById('threshtbl').style.display = '';
  document.getElementById('formpanel').style.display = '';
  document.getElementById('threshold').style.display = '';
  document.getElementById('thresholdlabel').style.display = '';
  document.getElementById('threshold').value = '1';
  document.getElementById('avgpanel').style.opacity = 0.6;
  document.getElementById('encpanel').style.opacity = 1;
  document.getElementById('menuenc').classList.remove('w3-blue');
  document.getElementById('menuenc').classList.add('w3-blue');
  document.getElementById('menuoverview').classList.remove('w3-blue');
  document.getElementById('menuavg').classList.remove('w3-blue');
}

function resetRows() {
  var tbl = document.getElementById('simtbl');
  while (tbl.rows.length>1) {
    tbl.deleteRow(1);
  }
}

function killWorkers() {
  for (var i=0;i<workers.length;i++) {
    workers[i].terminate();
  }
  workers = [];
  workerstats = {};
}
