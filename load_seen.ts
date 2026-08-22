import { someFunction } from './module';

function doSomething(): void {
  const result: any = someFunction();
  console.log(result);
}

export { doSomething };
