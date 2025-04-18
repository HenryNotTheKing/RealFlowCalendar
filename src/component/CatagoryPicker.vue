<template>
<div class="picker">
    <!-- 新增分类项容器 -->
    <div class="category-container">
        <div 
            class="category-item"
            v-for="(category, index) in useEventData.catagories"
            :key="index"
        >
            <div 
                class="color-display"
                :style="{backgroundColor :useEventData.colorMap[useEventData.colors[index]]['--baseColor']}"
                @click="toggleColorPicker(index, $event)"
            ></div>
            <input
                class="text-display"
                type="text" 
                v-model="useEventData.catagories[index]"
            >
        </div>
    </div>

    <!-- 新增分类按钮 -->
    <div class="add-catagory">
        <div class="add" @click="addCategory()">
            <img src="../assets/Icons/Plus.svg" alt="ADD" class="add-icon" />
        </div>
        <div class="text-add">添加分类</div>
    </div>

    <!-- 颜色选择器菜单（保持在底部） -->
    <div v-show="activeColorIndex !== null" class="color-picker-menu" :style="menuPosition">
    <div 
        v-for="(color, cIndex) in colorOptions" 
        :key="cIndex"
        class="color-option"
        :style="{backgroundColor: Object.values(color)[0]}"
        @click.stop="selectColor(cIndex, activeColorIndex)" 
    ></div>
</div>
</div>
</template>

<script lang='ts' setup>
import { ref } from 'vue';
import { EventData } from '../stores/EventData';

const useEventData = EventData();
const activeColorIndex = ref<number | null>(null);
const colorOptions = [
    {'Blue':'#409EFF'},
    {'Green':'#67C23A'},
    {'Yellow':'#E6A23C'},
    {'Red':'#F56C6C'},
    {'Purple':'#E91E63'},
];

const menuPosition = ref({
    left: '0px',
    top: '0px'
})

const toggleColorPicker = (index: number, event: MouseEvent) => {
    activeColorIndex.value = activeColorIndex.value === index ? null : index;
    
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const parentRect = target.offsetParent?.getBoundingClientRect() || { top: 0, left: 0 };
    
    // 计算相对父容器的垂直位置（居中显示）
    menuPosition.value = {
        left: `${rect.left + rect.width + 8 - (parentRect?.left || 0)}px`,
        top: `${rect.top + rect.height/2 - (parentRect?.top || 0) - 20}px` // 调整垂直居中
    }
}
const selectColor = (colorIndex: number, targetIndex: number | null) => {
    if (targetIndex !== null) {
        const selectedHex = Object.keys(colorOptions[colorIndex])[0];
        useEventData.colors[targetIndex] = selectedHex;  // 直接使用目标索引
    }
    activeColorIndex.value = null;  // 关闭颜色选择器
}

const isEditing = ref(false);

const saveCategory = () => {
    isEditing.value = false;
    // 这里可以添加保存分类到store的逻辑
    // useEventData.addCategory(categoryName.value, selectedColor.value);
}
const addCategory = () => {
  useEventData.catagories.push('');
  useEventData.colors.push('Blue');
}
</script>

<style scoped>
.category-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 80%;
    margin-bottom: 12px;
}

.category-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 30px;
}

.color-picker-menu {
    position: absolute;
    left: 0;
    top: 0;
    transform: translateY(-50%);
    background: #F7F7F7;
    padding: 8px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    display: flex;
    gap: 6px;
    z-index: 1000;
    transform: translateY(12%);
}

.color-option {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    cursor: pointer;
    transition: transform 0.2s;
}

.color-option:hover {
    transform: scale(1.1);
}

.picker{
    position: relative;
    top:10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
}
.category-container{
    display: flex;
    flex-direction: column;
    width:80%;
}
.catagory-display{
    width: 80%;
    height: 30px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    border-radius: 6px;
}

.add-catagory{
    width: 85%;
    height: 30px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    border-radius: 6px;
}
.color-display{
   height: 16px;
   width: 16px;
   border-radius: 4px;
   background-color: #000000;
   margin-left: 4px;
   cursor: pointer;
   transition: all 0.2s;
}
.text-display{
    font-size: 14px;
    color: #868686;
    margin-left: 8px;
    user-select: none;
    width: 90%;
    height: 24px;
    border-radius: 4px;

    border: none;
    outline: none;
    background: none;
    box-shadow: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
}
.text-display:focus {
    background-color: #efefef;
}
.text-display:hover{
    background-color: #efefef;
}
.add-icon{
    margin-left: 8px;
}
.text-add{
    font-size: 14px;
    color: #868686;
    margin-left: 8px;
    user-select: none;
    width: 90%;
    height: 24px;
    border-radius: 4px;
    font-size: 14px;
}
.add-catagory:hover{
    background-color: #efefef;
}
</style>