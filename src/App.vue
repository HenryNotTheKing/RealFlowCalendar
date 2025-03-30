<template>
  <div>
    <header class="navbar" style="-webkit-app-region: drag">
      <div class = "left-bar"></div>
      <div class = "center-panel"></div>
      <div class = "right-bar"></div>
    </header>
    <div class="container">
     <div class="left-panel">
      <div class="button-bar">
        <router-link to = "/" class="btn-gray"><img src=".\assets\Icons\Calendar.svg" alt="calendar"></router-link>
        <router-link to = "/Gantt" class="btn-gray"><img src=".\assets\Icons\CheckSquare.svg" alt="calendar"></router-link>
        <router-link to = "/Todo" class="btn-gray"><img src=".\assets\Icons\Table.svg" alt="calendar"></router-link>
      </div>
     </div>
     <div class="center-panel"></div>
     <div class="right-panel"></div>
     <div class="sub-container"><router-view></router-view></div>
    </div>
  </div>

</template>

<script setup>

</script>

<style>

</style>
