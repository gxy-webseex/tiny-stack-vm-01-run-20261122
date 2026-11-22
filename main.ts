// A tiny stack VM: a correct, compact interpreter of make.fun's ISA (ISA.md).
import {mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

// opcode -> imm*16+pops*4+pushes; absent = unknown opcode
const T={0:0,1:17,2:65,3:4,4:6,5:10,6:11,7:15,16:9,17:9,18:9,19:9,20:9,21:9,22:9,23:5,24:9,25:9,26:9,27:5,28:9,29:9,30:9,32:9,33:9,34:9,48:32,49:36,50:36,51:32,52:0,64:5,65:8,80:4,81:4,82:1,83:4};

function run(p,q){
  const D=new Int32Array(256),C=new Int32Array(64),M=new Int32Array(256),O=new Uint8Array(65536);
  let sp=0,cp=0,ol=0,ip=0,pc=0,st=0;
  const n=p.length;
  const end=c=>({o:O.slice(0,ol),c});
  for(;;){
    if(st===1e6)return end(10);
    if(pc<0||pc>=n)return end(9);
    const op=p[pc],m=T[op];
    if(m===undefined)return end(5);
    const imm=m>>4,po=(m>>2)&3,pu=m&3;
    if(pc+imm>=n)return end(9);
    st++;
    const nx=pc+1+imm;
    if(sp<po)return end(2);
    if(sp-po+pu>256)return end(3);
    pc=nx;
    switch(op){
      case 0:return end(0);
      case 1:D[sp++]=(p[nx-1]<<24)>>24;break;
      case 2:D[sp++]=p[nx-4]|p[nx-3]<<8|p[nx-2]<<16|p[nx-1]<<24;break;
      case 3:sp--;break;
      case 4:D[sp]=D[sp-1];sp++;break;
      case 5:{const t=D[sp-1];D[sp-1]=D[sp-2];D[sp-2]=t;break;}
      case 6:D[sp]=D[sp-2];sp++;break;
      case 7:{const a=D[sp-3];D[sp-3]=D[sp-2];D[sp-2]=D[sp-1];D[sp-1]=a;break;}
      case 23:D[sp-1]=-D[sp-1]|0;break;
      case 27:D[sp-1]=~D[sp-1];break;
      case 48:case 49:case 50:{
        const r=((p[nx-2]|p[nx-1]<<8)<<16)>>16;
        let t=true;
        if(op!==48){const v=D[--sp];t=op===49?v===0:v!==0;}
        if(t)pc=nx+r;
        break;
      }
      case 51:
        if(cp===64)return end(7);
        C[cp++]=nx;pc=p[nx-2]|p[nx-1]<<8;break;
      case 52:
        if(cp===0)return end(8);
        pc=C[--cp];break;
      case 64:{
        const a=D[sp-1];
        if(a<0||a>255)return end(6);
        D[sp-1]=M[a];break;
      }
      case 65:{
        const a=D[sp-1],v=D[sp-2];
        if(a<0||a>255)return end(6);
        sp-=2;M[a]=v;break;
      }
      case 80:{
        const s=String(D[sp-1]);
        if(ol+s.length>65536)return end(11);
        sp--;
        for(let i=0;i<s.length;i++)O[ol++]=s.charCodeAt(i);
        break;
      }
      case 81:
        if(ol+1>65536)return end(11);
        O[ol++]=D[--sp]&255;break;
      case 82:D[sp++]=ip<q.length?q[ip++]:-1;break;
      case 83:return end(D[--sp]&255);
      default:{
        const b=D[sp-1],a=D[sp-2];
        let r=0;
        if(op===16)r=a+b|0;
        else if(op===17)r=a-b|0;
        else if(op===18)r=Math.imul(a,b);
        else if(op===19){if(b===0)return end(4);r=a===-2147483648&&b===-1?a:(a/b)|0;}
        else if(op===20){if(b===0)return end(4);r=b===-1?0:a%b|0;}
        else if(op===21){if(b===0)return end(4);r=Math.floor((a>>>0)/(b>>>0))|0;}
        else if(op===22){if(b===0)return end(4);r=(a>>>0)%(b>>>0)|0;}
        else if(op===24)r=a&b;
        else if(op===25)r=a|b;
        else if(op===26)r=a^b;
        else if(op===28)r=a<<(b&31);
        else if(op===29)r=a>>(b&31);
        else if(op===30)r=(a>>>(b&31))|0;
        else if(op===32)r=a===b?1:0;
        else if(op===33)r=a<b?1:0;
        else if(op===34)r=(a>>>0)<(b>>>0)?1:0;
        else return end(5);
        sp-=2;D[sp++]=r;
      }
    }
  }
}

const I=process.env.MAKEFUN_INPUT_DIR??'/input';
const O=process.env.MAKEFUN_OUTPUT_DIR??'/output';
for(const id of readdirSync(I).sort()){
  const r=run(new Uint8Array(readFileSync(join(I,id,'program.bin'))),new Uint8Array(readFileSync(join(I,id,'input.bin'))));
  mkdirSync(join(O,id),{recursive:true});
  writeFileSync(join(O,id,'stdout.bin'),r.o);
  writeFileSync(join(O,id,'exit.txt'),`${r.c}\n`);
}
